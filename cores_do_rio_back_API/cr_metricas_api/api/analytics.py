from http.server import BaseHTTPRequestHandler
import json
import os
import numpy as np
from supabase import create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")]


def cors_headers(origin: str) -> dict:
    headers = {
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    }
    if origin in ALLOWED_ORIGINS:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Vary"] = "Origin"
    return headers


def next_month(year: int, month: int):
    return (year + 1, 1) if month == 12 else (year, month + 1)


def compute() -> dict:
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    resp = sb.from_("lancamentos").select("valor, tipo, data").order("data").execute()
    lancamentos = resp.data or []

    # Agrupa por mês (YYYY-MM)
    monthly: dict = {}
    for l in lancamentos:
        mes = str(l["data"])[:7]
        if mes not in monthly:
            monthly[mes] = {"entradas": 0.0, "saidas": 0.0}
        if l["tipo"] == "entrada":
            monthly[mes]["entradas"] += float(l["valor"])
        else:
            monthly[mes]["saidas"] += float(l["valor"])

    meses_ordenados = sorted(monthly.keys())
    serie = [
        {
            "mes": m,
            "entradas": round(monthly[m]["entradas"], 2),
            "saidas": round(monthly[m]["saidas"], 2),
            "saldo": round(monthly[m]["entradas"] - monthly[m]["saidas"], 2),
        }
        for m in meses_ordenados
    ]

    # Regressão linear sobre o saldo mensal
    projecao = []
    slope = 0.0
    intercept = 0.0

    if len(serie) >= 2:
        x = np.arange(len(serie), dtype=float)
        y = np.array([s["saldo"] for s in serie], dtype=float)
        coeffs = np.polyfit(x, y, 1)
        slope, intercept = float(coeffs[0]), float(coeffs[1])

        last = meses_ordenados[-1]
        year, month = int(last[:4]), int(last[5:7])
        for i in range(1, 4):
            year, month = next_month(year, month)
            proj_x = len(serie) - 1 + i
            projecao.append({
                "mes": f"{year:04d}-{month:02d}",
                "saldo_projetado": round(float(slope * proj_x + intercept), 2),
            })

    return {
        "financeiro_mensal": serie,
        "projecao": projecao,
        "tendencia": {
            "slope": round(slope, 2),
            "direcao": "positiva" if slope > 50 else "negativa" if slope < -50 else "estavel",
        },
    }


class handler(BaseHTTPRequestHandler):
    def _send(self, status: int, body: bytes, origin: str):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        for k, v in cors_headers(origin).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        origin = self.headers.get("Origin", "")
        self.send_response(200)
        for k, v in cors_headers(origin).items():
            self.send_header(k, v)
        self.end_headers()

    def do_GET(self):
        origin = self.headers.get("Origin", "")
        try:
            data = compute()
            self._send(200, json.dumps({"data": data}).encode(), origin)
        except Exception as e:
            self._send(500, json.dumps({"error": str(e)}).encode(), origin)

    def log_message(self, *_):
        pass
