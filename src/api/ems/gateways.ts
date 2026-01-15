import { http } from "@/utils/http";
import type { ApiResponse } from "./types";

export type GatewayDto = {
  gatewayId: string;
  projectId: string;
  name: string;
  status: string;
};

export type CreateGatewayRequest = {
  name: string;
  status?: string;
};

export const listGateways = (projectId: string) => {
  return http.request<ApiResponse<GatewayDto[]>>(
    "get",
    `/projects/${projectId}/gateways`
  );
};

export const createGateway = (
  projectId: string,
  data: CreateGatewayRequest
) => {
  return http.request<ApiResponse<GatewayDto>>(
    "post",
    `/projects/${projectId}/gateways`,
    { data }
  );
};
