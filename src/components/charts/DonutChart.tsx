import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Label } from 'recharts';

export interface DonutDataItem {
  name: string;
  value: number;
  color?: string;
}

interface DonutChartProps {
  data: DonutDataItem[];
  valueFormatter?: (value: number) => string;
  height?: number;
}

const BRAND_COLORS = ['#8E5FCF', '#B987FF', '#C7A1FC', '#FAF66B', '#E2CEFF', '#47118F', '#D4B8FF'];

const defaultFormatter = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function CentralLabel({
  viewBox,
  total,
  formatter,
}: {
  viewBox?: { cx: number; cy: number; innerRadius: number; outerRadius: number };
  total: number;
  formatter: (v: number) => string;
}) {
  const { cx = 0, cy = 0 } = viewBox ?? {};
  return (
    <g>
      <text
        x={cx}
        y={cy - 10}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#6B7280"
        style={{ fontSize: 12, fontFamily: 'Gilroy, system-ui, sans-serif' }}
      >
        Total
      </text>
      <text
        x={cx}
        y={cy + 14}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#1F2937"
        style={{ fontSize: 14, fontWeight: 700, fontFamily: 'Gilroy, system-ui, sans-serif' }}
      >
        {formatter(total)}
      </text>
    </g>
  );
}

function CustomTooltip({
  active,
  payload,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
  formatter: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-white border border-border rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-foreground mb-1">{item.name}</p>
      <p className="text-muted-foreground">{formatter(item.value)}</p>
    </div>
  );
}

export function DonutChart({
  data,
  valueFormatter = defaultFormatter,
  height = 280,
}: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="flex flex-col gap-4">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={75}
            outerRadius={115}
            paddingAngle={4}
            cornerRadius={6}
            dataKey="value"
            isAnimationActive={true}
            animationBegin={0}
            animationDuration={700}
            strokeWidth={0}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color ?? BRAND_COLORS[index % BRAND_COLORS.length]}
              />
            ))}
            <Label
              content={(props) => (
                <CentralLabel
                  viewBox={props.viewBox as Parameters<typeof CentralLabel>[0]['viewBox']}
                  total={total}
                  formatter={valueFormatter}
                />
              )}
              position="center"
            />
          </Pie>
          <Tooltip content={<CustomTooltip formatter={valueFormatter} />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Custom Legend */}
      <div className="flex flex-col gap-2 px-2">
        {data.map((entry, index) => {
          const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0.0';
          const color = entry.color ?? BRAND_COLORS[index % BRAND_COLORS.length];
          return (
            <div key={entry.name} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-muted-foreground truncate">{entry.name}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-muted-foreground text-xs">{pct}%</span>
                <span className="font-semibold text-foreground">{valueFormatter(entry.value)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
