import { useState, useEffect, useCallback } from "react";
import { diarioService } from "../services/diarioService";
import type { Diario } from "../types";

export function useDiarios(portal?: string) {
  const [diarios, setDiarios] = useState<Diario[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await diarioService.listar(portal, 0, 500);
      setDiarios(res.items);
      setTotal(res.total);
    } catch {
      setError(
        "Falha ao carregar diários. Verifique se o backend está rodando.",
      );
    } finally {
      setLoading(false);
    }
  }, [portal]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { diarios, total, loading, error, refetch: fetch };
}
