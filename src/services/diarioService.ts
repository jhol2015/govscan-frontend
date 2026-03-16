import api from "./api";
import type { DiarioListResponse, SincronizarResponse } from "../types";

function isMissingEndpoint(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response
    ?.status;
  return status === 404 || status === 405;
}

function extractYear(value: string): number | null {
  const firstToken = value.split("T")[0] ?? value;
  const [year] = firstToken.split("-");
  const parsed = Number(year);
  return Number.isNaN(parsed) ? null : parsed;
}

const PAGE_LIMIT = 200;

export const diarioService = {
  async listar(
    portal?: string,
    skip = 0,
    limit = 100,
  ): Promise<DiarioListResponse> {
    const params: Record<string, unknown> = { skip, limit };
    if (portal) params.portal = portal;
    const { data } = await api.get("/api/v1/diarios/", { params });
    return data;
  },

  async sincronizar(portal: string, ano: number): Promise<SincronizarResponse> {
    const { data } = await api.post("/api/v1/diarios/sincronizar", null, {
      params: { portal, ano },
    });
    return data;
  },

  async reprocessarFalhas(ids: number[]): Promise<SincronizarResponse> {
    try {
      const { data } = await api.post("/api/v1/diarios/reprocessar-falhas", {
        ids,
      });
      return data;
    } catch (firstError) {
      if (!isMissingEndpoint(firstError)) throw firstError;

      try {
        const { data } = await api.post("/api/v1/diarios/reprocessar", { ids });
        return data;
      } catch (secondError) {
        if (isMissingEndpoint(secondError)) {
          throw new Error("RETRY_NOT_SUPPORTED");
        }
        throw secondError;
      }
    }
  },

  async reprocessarFalhasPorPortalAno(
    portal: string,
    ano: number,
  ): Promise<SincronizarResponse> {
    try {
      const { data } = await api.post(
        "/api/v1/diarios/reprocessar-falhas",
        null,
        {
          params: { portal, ano },
        },
      );
      return data;
    } catch (firstError) {
      if (!isMissingEndpoint(firstError)) throw firstError;

      try {
        const { data } = await api.post("/api/v1/diarios/reprocessar", null, {
          params: { portal, ano },
        });
        return data;
      } catch (secondError) {
        if (!isMissingEndpoint(secondError)) throw secondError;
      }
    }

    let skip = 0;
    let total = Number.POSITIVE_INFINITY;
    const erroIds: number[] = [];

    while (skip < total) {
      const page = await this.listar(portal, skip, PAGE_LIMIT);
      total = page.total;

      page.items.forEach((item) => {
        if (item.status === "error" && extractYear(item.data_edicao) === ano) {
          erroIds.push(item.id);
        }
      });

      skip += PAGE_LIMIT;
      if (page.items.length === 0) break;
    }

    if (erroIds.length === 0) {
      return { portal, ano, salvos: 0, erros: 0 };
    }

    return this.reprocessarFalhas(erroIds);
  },

  async listarPortais(): Promise<string[]> {
    const { data } = await api.get("/api/v1/portals/");
    return data.portais;
  },
};
