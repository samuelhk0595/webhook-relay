import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SeriesPoint } from "../lib/contracts";
import { number } from "../lib/utils";

export default function TrafficChart({ points }: { points: SeriesPoint[] }) {
  const time = (value: string) =>
    new Date(value).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  return (
    <>
      <div
        className="chart"
        role="img"
        aria-label="Gráfico temporal de eventos recebidos, ciclos de entrega concluídos e tentativas com falha. Os valores também estão disponíveis na tabela de dados abaixo."
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart
            data={points}
            margin={{ top: 12, right: 14, bottom: 0, left: 0 }}
            accessibilityLayer
          >
            <CartesianGrid
              strokeDasharray="3 4"
              vertical={false}
              stroke="var(--border)"
            />
            <XAxis
              dataKey="timestamp"
              tickFormatter={time}
              minTickGap={56}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#526575", fontSize: 11 }}
              dy={9}
            />
            <YAxis
              allowDecimals={false}
              tickFormatter={number}
              width={45}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#526575", fontSize: 11 }}
            />
            <Tooltip
              labelFormatter={(label) => time(String(label))}
              formatter={(value) => number(Number(value))}
              contentStyle={{
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend
              iconType="plainline"
              wrapperStyle={{ paddingTop: 24, fontSize: 12 }}
            />
            <Line
              type="linear"
              dataKey="received"
              name="Eventos recebidos"
              stroke="#386ad0"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="linear"
              dataKey="delivered"
              name="Entregas concluídas"
              stroke="#16776b"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="linear"
              dataKey="failed_attempts"
              name="Tentativas com falha"
              stroke="#ad670c"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className="chart-data">
        <summary>Consultar dados do gráfico</summary>
        <div className="table-scroll">
          <table>
            <caption className="sr-only">
              Dados da atividade por intervalo
            </caption>
            <thead>
              <tr>
                <th>Instante</th>
                <th>Eventos recebidos</th>
                <th>Entregas concluídas</th>
                <th>Tentativas com falha</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.timestamp}>
                  <td>{time(point.timestamp)}</td>
                  <td>{number(point.received)}</td>
                  <td>{number(point.delivered)}</td>
                  <td>{number(point.failed_attempts)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
