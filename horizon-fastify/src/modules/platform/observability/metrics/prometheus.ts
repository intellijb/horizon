export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary'
}

export interface IMetric {
  name: string;
  type: MetricType;
  help: string;
  labels: string[];
}

export interface ICounter extends IMetric {
  inc(value?: number, labels?: Record<string, string>): void;
  reset(): void;
  get(labels?: Record<string, string>): number;
}

export interface IGauge extends IMetric {
  set(value: number, labels?: Record<string, string>): void;
  inc(value?: number, labels?: Record<string, string>): void;
  dec(value?: number, labels?: Record<string, string>): void;
  get(labels?: Record<string, string>): number;
}

export interface IHistogram extends IMetric {
  observe(value: number, labels?: Record<string, string>): void;
  get(labels?: Record<string, string>): HistogramData;
}

export interface ISummary extends IMetric {
  observe(value: number, labels?: Record<string, string>): void;
  get(labels?: Record<string, string>): SummaryData;
}

export interface HistogramData {
  buckets: Map<number, number>;
  count: number;
  sum: number;
}

export interface SummaryData {
  percentiles: Map<number, number>;
  count: number;
  sum: number;
}

class Counter implements ICounter {
  name: string;
  type = MetricType.COUNTER;
  help: string;
  labels: string[];
  private values = new Map<string, number>();

  constructor(name: string, help: string, labels: string[] = []) {
    this.name = name;
    this.help = help;
    this.labels = labels;
  }

  inc(value: number = 1, labels?: Record<string, string>): void {
    const key = this.getLabelKey(labels);
    const current = this.values.get(key) || 0;
    this.values.set(key, current + value);
  }

  reset(): void {
    this.values.clear();
  }

  get(labels?: Record<string, string>): number {
    const key = this.getLabelKey(labels);
    return this.values.get(key) || 0;
  }

  private getLabelKey(labels?: Record<string, string>): string {
    if (!labels || this.labels.length === 0) return '';
    return this.labels.map(l => labels[l] || '').join(',');
  }

  toPrometheus(): string {
    const lines: string[] = [];
    lines.push(`# HELP ${this.name} ${this.help}`);
    lines.push(`# TYPE ${this.name} ${this.type}`);

    if (this.values.size === 0) {
      lines.push(`${this.name} 0`);
    } else {
      for (const [labelKey, value] of this.values.entries()) {
        const labelString = this.formatLabels(labelKey);
        lines.push(`${this.name}${labelString} ${value}`);
      }
    }

    return lines.join('\n');
  }

  private formatLabels(labelKey: string): string {
    if (!labelKey) return '';
    const values = labelKey.split(',');
    const pairs = this.labels.map((label, i) => `${label}="${values[i] || ''}"`);
    return `{${pairs.join(',')}}`;
  }
}

class Gauge implements IGauge {
  name: string;
  type = MetricType.GAUGE;
  help: string;
  labels: string[];
  private values = new Map<string, number>();

  constructor(name: string, help: string, labels: string[] = []) {
    this.name = name;
    this.help = help;
    this.labels = labels;
  }

  set(value: number, labels?: Record<string, string>): void {
    const key = this.getLabelKey(labels);
    this.values.set(key, value);
  }

  inc(value: number = 1, labels?: Record<string, string>): void {
    const key = this.getLabelKey(labels);
    const current = this.values.get(key) || 0;
    this.values.set(key, current + value);
  }

  dec(value: number = 1, labels?: Record<string, string>): void {
    const key = this.getLabelKey(labels);
    const current = this.values.get(key) || 0;
    this.values.set(key, current - value);
  }

  get(labels?: Record<string, string>): number {
    const key = this.getLabelKey(labels);
    return this.values.get(key) || 0;
  }

  private getLabelKey(labels?: Record<string, string>): string {
    if (!labels || this.labels.length === 0) return '';
    return this.labels.map(l => labels[l] || '').join(',');
  }
}

class Histogram implements IHistogram {
  name: string;
  type = MetricType.HISTOGRAM;
  help: string;
  labels: string[];
  private data = new Map<string, HistogramData>();
  private buckets: number[];

  constructor(name: string, help: string, labels: string[] = [], buckets?: number[]) {
    this.name = name;
    this.help = help;
    this.labels = labels;
    this.buckets = buckets || [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
  }

  observe(value: number, labels?: Record<string, string>): void {
    const key = this.getLabelKey(labels);
    let data = this.data.get(key);

    if (!data) {
      data = {
        buckets: new Map(this.buckets.map(b => [b, 0])),
        count: 0,
        sum: 0
      };
      this.data.set(key, data);
    }

    // Update buckets
    for (const bucket of this.buckets) {
      if (value <= bucket) {
        const current = data.buckets.get(bucket) || 0;
        data.buckets.set(bucket, current + 1);
      }
    }

    data.count++;
    data.sum += value;
  }

  get(labels?: Record<string, string>): HistogramData {
    const key = this.getLabelKey(labels);
    return this.data.get(key) || {
      buckets: new Map(),
      count: 0,
      sum: 0
    };
  }

  private getLabelKey(labels?: Record<string, string>): string {
    if (!labels || this.labels.length === 0) return '';
    return this.labels.map(l => labels[l] || '').join(',');
  }
}

export class MetricsRegistry {
  private metrics = new Map<string, ICounter | IGauge | IHistogram | ISummary>();

  registerCounter(name: string, help: string, labels?: string[]): ICounter {
    const counter = new Counter(name, help, labels);
    this.metrics.set(name, counter);
    return counter;
  }

  registerGauge(name: string, help: string, labels?: string[]): IGauge {
    const gauge = new Gauge(name, help, labels);
    this.metrics.set(name, gauge);
    return gauge;
  }

  registerHistogram(name: string, help: string, labels?: string[], buckets?: number[]): IHistogram {
    const histogram = new Histogram(name, help, labels, buckets);
    this.metrics.set(name, histogram);
    return histogram;
  }

  getMetric(name: string): ICounter | IGauge | IHistogram | ISummary | undefined {
    return this.metrics.get(name);
  }

  /**
   * Export metrics in Prometheus format
   */
  export(): string {
    const lines: string[] = [];

    for (const metric of this.metrics.values()) {
      if (metric instanceof Counter || metric instanceof Gauge) {
        lines.push((metric as any).toPrometheus());
      }
    }

    return lines.join('\n\n');
  }

  reset(): void {
    for (const metric of this.metrics.values()) {
      if (metric instanceof Counter) {
        metric.reset();
      }
    }
  }
}

// Global metrics registry
const globalRegistry = new MetricsRegistry();

// Pre-defined metrics
export const httpRequestDuration = globalRegistry.registerHistogram(
  'http_request_duration_seconds',
  'HTTP request duration in seconds',
  ['method', 'route', 'status_code']
);

export const httpRequestTotal = globalRegistry.registerCounter(
  'http_request_total',
  'Total number of HTTP requests',
  ['method', 'route', 'status_code']
);

export const activeConnections = globalRegistry.registerGauge(
  'active_connections',
  'Number of active connections'
);

export const databaseQueryDuration = globalRegistry.registerHistogram(
  'database_query_duration_seconds',
  'Database query duration in seconds',
  ['query_type', 'table']
);

export const cacheHits = globalRegistry.registerCounter(
  'cache_hits_total',
  'Total number of cache hits',
  ['cache_type']
);

export const cacheMisses = globalRegistry.registerCounter(
  'cache_misses_total',
  'Total number of cache misses',
  ['cache_type']
);

export function getGlobalRegistry(): MetricsRegistry {
  return globalRegistry;
}