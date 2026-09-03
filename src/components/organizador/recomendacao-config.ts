/**
 * Cookie da preferência "recomendação de tatames recolhida" na tela de Áreas.
 *
 * Módulo plano (sem "use client") para o servidor (página de Áreas) e o cliente
 * (widget) compartilharem o mesmo nome — mesmo padrão de `nav-mobile-config`.
 * É lido no servidor para semear o estado inicial sem flash e gravado no
 * cliente ao recolher/mostrar, então a escolha vale para os próximos acessos.
 */
export const COOKIE_RECOMENDACAO_AREAS = "leaguemat_rec_areas";
