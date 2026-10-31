export interface EventInfo {
  id: string;
  label: string;
  detail: string;
  fetchWith: string;
}
export interface EndpointView {
  id: number;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  disabledReason: string | null;
  consecutiveFailures: number;
  lastSuccessAt: string | null;
  createdAt: string;
}
export interface EndpointsResponse {
  maxEndpoints: number;
  events: EventInfo[];
  endpoints: EndpointView[];
}
export interface DeliveryItem {
  id: string;
  eventType: string;
  status: "PENDING" | "SUCCESS" | "DEAD";
  attempts: number;
  lastStatusCode: number | null;
  lastError: string | null;
  createdAt: string;
  deliveredAt: string | null;
  nextAttemptAt: string | null;
}
