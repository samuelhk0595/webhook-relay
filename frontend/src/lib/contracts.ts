/** Response DTOs generated from the Rust/Utoipa OpenAPI. npm run api:check detects drift. */
import type { components } from "./openapi.generated";
type Schemas = components["schemas"];
export interface Page<T> { items: T[]; next_cursor: string | null }
export type Session = Schemas["Session"];
export type ApiProblem = Schemas["ApiProblem"];
export type Namespace = Schemas["Namespace"];
// The namespace editor shares create/patch input; slug is supplied only on create.
export type NamespaceInput = Omit<Schemas["NamespaceInput"], "slug"> & { slug?: string };
export type Destination = Schemas["Destination"];
export type DestinationInput = Schemas["DestinationInput"];
export type ResourceStatus = Destination["status"];
export type Delivery = Schemas["Delivery"];
export type DeliveryState = Delivery["state"];
export type WebhookEvent = Schemas["WebhookEvent"];
export type Header = Schemas["Header"];
export type Attempt = Schemas["Attempt"];
export type EventDetail = Schemas["EventDetail"];
export type Token = Schemas["Token"];
export type CreatedToken = Schemas["CreatedToken"];
export type Period = Schemas["Period"];
export type Queue = Schemas["Queue"];
export type Summary = Schemas["Summary"];
export type SeriesPoint = Schemas["SeriesPoint"];
export type Timeseries = Schemas["Timeseries"];
export type DestinationStats = Schemas["DestinationStats"];
export type Params = Record<string, string | number | undefined>;
