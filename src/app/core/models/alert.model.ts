export type AlertCondition = 'above' | 'below';
export type AlertStatus    = 'active' | 'triggered' | 'dismissed';

export interface PriceAlert {
  id:          string;
  ticker:      string;
  condition:   AlertCondition;
  targetPrice: number;
  note?:       string;
  createdAt:   string;
  triggeredAt?: string;
  status:      AlertStatus;
}
