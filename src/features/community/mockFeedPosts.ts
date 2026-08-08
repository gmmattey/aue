import type { FeedPost } from './FeedScreen';

/**
 * Posts FICTÍCIOS para trabalhar a interface do feed sem backend.
 *
 * Vive em módulo próprio, e não dentro do `FeedScreen`, que o importa
 * dinamicamente dentro do ramo de `VITE_FEED_DEMO`.
 *
 * O QUE ISSO GARANTE, COM PRECISÃO: o ramo é inalcançável com o modo
 * desligado, porque `VITE_FEED_DEMO` não vale '1' — nenhum destes posts chega
 * à tela, e se chegasse viria com o aviso vermelho de demonstração.
 *
 * O QUE NÃO GARANTE: que os bytes sumam do bundle. Verificado — o Rolldown
 * embute este módulo no chunk principal em vez de separá-lo, por ser pequeno e
 * ter um único ponto de importação. São ~700 bytes de texto inalcançável.
 * Perseguir isso não vale a briga com o bundler; o que importa é que não
 * renderiza.
 *
 * NUNCA referencie isto fora do modo demonstração. Estes posts já foram
 * exibidos como conteúdo real: o feed caía neles em QUALQUER falha de rede,
 * sem aviso, e o usuário não tinha como saber que "Carol" e "Bruno" não
 * existiam.
 */
export const mockFeedPosts: FeedPost[] = [
  {
    id: 'post-1',
    post_type: 'social_link',
    topic: 'Todos',
    social_network: 'Instagram',
    social_url: 'https://instagram.com/carol.arrota',
    created_at: new Date().toISOString(),
    profile: { id: 'user-1', apelido: 'Carol' },
    comentarios: [{ count: 6 }],
  },
  {
    id: 'post-2',
    post_type: 'audio_result',
    topic: 'Arrotos lendários',
    created_at: new Date().toISOString(),
    profile: { id: 'user-1', apelido: 'Carol' },
    result: { id: 'res-1', score: 98.1, classification: 'Deus do Auê' },
    comentarios: [{ count: 12 }],
  },
  {
    id: 'post-3',
    post_type: 'audio_result',
    topic: 'Pós-bebida',
    created_at: new Date().toISOString(),
    profile: { id: 'user-2', apelido: 'Bruno' },
    result: { id: 'res-2', score: 95.6, classification: 'Mestre Arrotador' },
    comentarios: [{ count: 3 }],
  },
];
