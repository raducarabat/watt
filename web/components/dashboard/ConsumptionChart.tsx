"use client";

import { useMemo, useState, useTransition } from "react";

import { fetchConsumptionAction } from "@/app/(protected)/dashboard/consumption-actions";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/Card";
import type { ConsumptionResponse, Device } from "@/lib/types";
import { Badge } from "@/components/Badge";

interface ConsumptionChartProps {
  devices: Device[];
  initialDeviceId?: string | null;
  initialDay: string;
  initialData: ConsumptionResponse | null;
  unitLabel: string;
}

export function ConsumptionChart({
  devices,
  initialDeviceId,
  initialDay,
  initialData,
  unitLabel,
}: ConsumptionChartProps) {
  const [selectedDevice, setSelectedDevice] = useState<string>(
    initialDeviceId ?? devices[0]?.id ?? "",
  );
  const [selectedDay, setSelectedDay] = useState(initialDay);
  const [data, setData] = useState<ConsumptionResponse | null>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const points = useMemo(() => {
    return data?.points ?? Array.from({ length: 24 }, (_, hour) => ({ hour, value: 0 }));
  }, [data]);

  const total = useMemo(
    () => points.reduce((sum, point) => sum + point.value, 0),
    [points],
  );

  const chartPoints = useMemo(() => {
    const maxValue = Math.max(...points.map((point) => point.value), 0.0001);
    return points.map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * 100;
      const y = 100 - (point.value / maxValue) * 100;
      return { ...point, x, y, value: point.value };
    });
  }, [points]);

  const linePath = useMemo(() => {
    if (chartPoints.length === 0) return "";
    const first = chartPoints[0];
    const segments = chartPoints
      .slice(1)
      .map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
      .join(" ");
    return `M ${first.x.toFixed(2)} ${first.y.toFixed(2)} ${segments}`;
  }, [chartPoints]);

  const areaPath = useMemo(() => {
    if (chartPoints.length === 0) return "";
    const first = chartPoints[0];
    const last = chartPoints.at(-1);
    const line = chartPoints
      .slice(1)
      .map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
      .join(" ");
    return `M ${first.x.toFixed(2)} 100 L ${first.x.toFixed(2)} ${first.y.toFixed(
      2,
    )} ${line} L ${last?.x.toFixed(2)} 100 Z`;
  }, [chartPoints]);

  const handleRefresh = (deviceId: string, day: string) => {
    if (!deviceId) return;
    startTransition(async () => {
      setError(null);
      const result = await fetchConsumptionAction(deviceId, day);
      if (!result.success) {
        setError(result.error ?? "Unable to load consumption data.");
        if (result.redirect) {
          window.location.assign(result.redirect);
        }
        return;
      }
      setData(result.data ?? null);
    });
  };

  const handleDeviceChange = (value: string) => {
    setSelectedDevice(value);
    handleRefresh(value, selectedDay);
  };

  const handleDayChange = (value: string) => {
    setSelectedDay(value);
    if (!value) return;
    handleRefresh(selectedDevice, value);
  };

  return (
    <Card className="space-y-6">
      <CardHeader>
        <CardTitle>Daily energy trend</CardTitle>
        <CardDescription>Hourly aggregates for the selected device.</CardDescription>
      </CardHeader>

      {devices.length === 0 ? (
        <p className="text-sm text-neutral-400">No devices available yet.</p>
      ) : (
        <>
          <div className="flex flex-col gap-4 lg:flex-row">
            <label className="flex flex-col text-sm">
              <span className="mb-1 text-neutral-400">Device</span>
              <select
                className="rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white"
                value={selectedDevice}
                onChange={(event) => handleDeviceChange(event.target.value)}
                disabled={isPending}
              >
                {devices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col text-sm">
              <span className="mb-1 text-neutral-400">Day</span>
              <input
                type="date"
                className="rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white"
                value={selectedDay}
                onChange={(event) => handleDayChange(event.target.value)}
                max={initialDay}
                disabled={isPending}
              />
            </label>

            <div className="flex items-end">
              <Badge variant="muted">
                Total {total.toFixed(2)} {unitLabel}
              </Badge>
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </p>
          )}

          <div className="space-y-4">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 px-4 pb-4 pt-6">
              <svg viewBox="0 0 100 100" className="h-56 w-full">
                <defs>
                  <linearGradient id="energy-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(16,185,129,0.35)" />
                    <stop offset="100%" stopColor="rgba(16,185,129,0.05)" />
                  </linearGradient>
                </defs>
                <path d={areaPath} fill="url(#energy-fill)" stroke="none" />
                <path d={linePath} fill="none" stroke="#34d399" strokeWidth={1.5} />
                {chartPoints.map((point) => (
                  <g key={point.hour}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={point.value > 0 ? 1.4 : 0.9}
                      fill="#34d399"
                    />
                    {point.hour % 6 === 0 && (
                      <text
                        x={point.x}
                        y={96}
                        textAnchor="middle"
                        className="fill-neutral-500 text-[3px]"
                      >
                        {point.hour}
                      </text>
                    )}
                  </g>
                ))}
              </svg>
            </div>
            <p className="text-xs text-neutral-500">
              Values represent hourly energy consumption ({unitLabel}) for the selected day.
            </p>
          </div>
        </>
      )}
    </Card>
  );
}
