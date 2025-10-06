import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { toast } from 'react-toastify';
import cmsService from '../services/cmsService';

// Estados do CMS
const initialState = {
  secoes: [],
  currentSecao: null,
  conteudos: [],
  loading: false,
  error: null,
  lastUpdate: null,
};

// Actions
const CMS_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_SECOES: 'SET_SECOES',
  SET_CURRENT_SECAO: 'SET_CURRENT_SECAO',
  SET_CONTEUDOS: 'SET_CONTEUDOS',
  UPDATE_CONTEUDO: 'UPDATE_CONTEUDO',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_LAST_UPDATE: 'SET_LAST_UPDATE',
};

// Reducer
function cmsReducer(state, action) {
  switch (action.type) {
    case CMS_ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };

    case CMS_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, loading: false };

    case CMS_ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };

    case CMS_ACTIONS.SET_SECOES:
      return { ...state, secoes: action.payload, loading: false };

    case CMS_ACTIONS.SET_CURRENT_SECAO:
      return { ...state, currentSecao: action.payload };

    case CMS_ACTIONS.SET_CONTEUDOS:
      return { ...state, conteudos: action.payload, loading: false };

    case CMS_ACTIONS.UPDATE_CONTEUDO:
      return {
        ...state,
        conteudos: state.conteudos.map(content =>
          content.id === action.payload.id
            ? { ...content, ...action.payload.data }
            : content
        ),
        lastUpdate: Date.now(),
      };

    case CMS_ACTIONS.SET_LAST_UPDATE:
      return { ...state, lastUpdate: Date.now() };

    default:
      return state;
  }
}

// Context
const CMSContext = createContext();

// Provider
export function CMSProvider({ children }) {
  const [state, dispatch] = useReducer(cmsReducer, initialState);

  // Carregar seções
  const loadSecoes = useCallback(async () => {
    try {
      dispatch({ type: CMS_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: CMS_ACTIONS.CLEAR_ERROR });

      const secoes = await cmsService.getSecoes();
      dispatch({ type: CMS_ACTIONS.SET_SECOES, payload: secoes });
    } catch (error) {
      dispatch({ type: CMS_ACTIONS.SET_ERROR, payload: error.message });
      toast.error('Erro ao carregar seções');
    }
  }, []);

  // Carregar seção específica
  const loadSecao = useCallback(async (secaoId) => {
    try {
      dispatch({ type: CMS_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: CMS_ACTIONS.CLEAR_ERROR });

      const data = await cmsService.getSecao(secaoId);
      dispatch({ type: CMS_ACTIONS.SET_CURRENT_SECAO, payload: data.secao });
      dispatch({ type: CMS_ACTIONS.SET_CONTEUDOS, payload: data.conteudos });
    } catch (error) {
      dispatch({ type: CMS_ACTIONS.SET_ERROR, payload: error.message });
      toast.error('Erro ao carregar seção');
    }
  }, []);

  // Atualizar conteúdo
  const updateConteudo = useCallback(async (conteudoId, valor) => {
    try {
      const result = await cmsService.updateConteudo(conteudoId, valor);

      dispatch({
        type: CMS_ACTIONS.UPDATE_CONTEUDO,
        payload: {
          id: conteudoId,
          data: { valor }
        }
      });

      toast.success('Conteúdo atualizado com sucesso!');
      return result;
    } catch (error) {
      toast.error('Erro ao atualizar conteúdo');
      throw error;
    }
  }, []);

  // Upload de imagem
  const uploadImagem = useCallback(async (conteudoId, file, altText) => {
    try {
      const result = await cmsService.uploadImagem(conteudoId, file, altText);

      dispatch({
        type: CMS_ACTIONS.UPDATE_CONTEUDO,
        payload: {
          id: conteudoId,
          data: {
            valor: result.caminho,
            alt_text: result.altText
          }
        }
      });

      toast.success('Imagem enviada com sucesso!');
      return result;
    } catch (error) {
      toast.error('Erro ao enviar imagem');
      throw error;
    }
  }, []);

  // Recarregar dados
  const reloadData = useCallback(async () => {
    if (state.currentSecao) {
      await loadSecao(state.currentSecao.id);
    } else {
      await loadSecoes();
    }
  }, [state.currentSecao, loadSecao, loadSecoes]);

  const value = {
    ...state,
    loadSecoes,
    loadSecao,
    updateConteudo,
    uploadImagem,
    reloadData,
  };

  return (
    <CMSContext.Provider value={value}>
      {children}
    </CMSContext.Provider>
  );
}

// Hook personalizado
export function useCMS() {
  const context = useContext(CMSContext);
  if (!context) {
    throw new Error('useCMS deve ser usado dentro de um CMSProvider');
  }
  return context;
}

export default CMSContext;