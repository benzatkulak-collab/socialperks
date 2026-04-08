// ══════════════════════════════════════════════════════════════════════════════
// Portuguese (pt) — Translations
// ══════════════════════════════════════════════════════════════════════════════

import type { TranslationStrings } from "../index";

const pt: TranslationStrings = {
  // ─── Navigation ──────────────────────────────────────────────────────────
  nav: {
    home: "Inicio",
    pricing: "Precos",
    contact: "Contato",
    howItWorks: "Como funciona",
    examples: "Exemplos",
    login: "Entrar",
    signup: "Criar conta",
    getStarted: "Comecar agora",
    logout: "Sair",
    dashboard: "Painel",
    campaigns: "Campanhas",
    earnings: "Ganhos",
    profile: "Perfil",
    settings: "Configuracoes",
    discover: "Descobrir",
    analytics: "Estatisticas",
    wallet: "Carteira",
  },

  // ─── Hero / Landing ─────────────────────────────────────────────────────
  hero: {
    headline: "Transforme seus clientes na sua equipe de marketing",
    subheadline:
      "Ofereca vantagens e descontos em troca de publicacoes nas redes sociais, avaliacoes e indicacoes. Funciona para qualquer negocio, de qualquer tamanho.",
    cta: "Comece gratis hoje",
    ctaSecondary: "Veja como funciona",
    trustedBy: "{{count}} negocios confiam em nos",
  },

  // ─── Auth ────────────────────────────────────────────────────────────────
  auth: {
    login: "Entrar",
    signup: "Criar conta",
    email: "E-mail",
    password: "Senha",
    confirmPassword: "Confirmar senha",
    forgotPassword: "Esqueceu a senha?",
    resetPassword: "Redefinir senha",
    resetPasswordSuccess: "Verifique seu e-mail para as instrucoes de redefinicao.",
    rememberMe: "Lembrar de mim",
    noAccount: "Nao tem uma conta?",
    haveAccount: "Ja tem uma conta?",
    orContinueWith: "Ou continue com",
    verifyEmail: "Verifique seu e-mail",
    verifyEmailMessage: "Enviamos um link de verificacao para {{email}}.",
    welcomeBack: "Bem-vindo de volta, {{name}}!",
  },

  // ─── Dashboard ───────────────────────────────────────────────────────────
  dashboard: {
    title: "Painel de controle",
    campaign: "Campanha",
    campaigns: "Campanhas",
    submission: "Envio",
    submissions: "Envios",
    earnings: "Ganhos",
    wallet: "Carteira",
    profile: "Perfil",
    analytics: "Estatisticas",
    overview: "Visao geral",
    recentActivity: "Atividade recente",
    totalEarnings: "Ganhos totais",
    activeCampaigns: "Campanhas ativas",
    pendingReview: "Aguardando revisao",
    completionRate: "Taxa de conclusao",
  },

  // ─── Business Portal ─────────────────────────────────────────────────────
  business: {
    createCampaign: "Criar campanha",
    launchCampaign: "Lancar campanha",
    pauseCampaign: "Pausar campanha",
    resumeCampaign: "Retomar campanha",
    endCampaign: "Encerrar campanha",
    editCampaign: "Editar campanha",
    campaignName: "Nome da campanha",
    campaignDescription: "Descricao da campanha",
    targetAudience: "Publico-alvo",
    budget: "Orcamento",
    duration: "Duracao",
    perkValue: "Valor do beneficio",
    requiredActions: "Acoes necessarias",
    businessName: "Nome do negocio",
    businessType: "Tipo de negocio",
    activeCampaigns: "Campanhas ativas",
    totalCompletions: "Total de conclusoes",
    revenueGenerated: "Receita gerada",
    customerReach: "Alcance de clientes",
    selectPlatform: "Selecionar plataforma",
    campaignTier: "Nivel da campanha",
    effortLevel: "Nivel de esforco",
  },

  // ─── Influencer Portal ───────────────────────────────────────────────────
  influencer: {
    discover: "Descobrir campanhas",
    submitProof: "Enviar prova",
    earnings: "Meus ganhos",
    cashOut: "Sacar",
    proofUrl: "URL da prova",
    proofDescription: "Descreva o que voce fez",
    followers: "Seguidores",
    engagementRate: "Taxa de engajamento",
    tier: "Nivel de influenciador",
    rateCard: "Tabela de precos",
    portfolio: "Portfolio",
    pendingPayouts: "Pagamentos pendentes",
    totalCashOuts: "Total de saques",
    availableBalance: "Saldo disponivel",
    completedCampaigns: "Campanhas concluidas",
  },

  // ─── Pricing ─────────────────────────────────────────────────────────────
  pricing: {
    title: "Precos simples e transparentes",
    subtitle: "Comece de graca e cresca no seu ritmo.",
    free: "Gratuito",
    pro: "Profissional",
    enterprise: "Empresarial",
    monthly: "Mensal",
    annual: "Anual",
    perMonth: "/mes",
    billedAnnually: "Cobrado anualmente",
    currentPlan: "Plano atual",
    upgrade: "Fazer upgrade",
    downgrade: "Fazer downgrade",
    contactSales: "Falar com vendas",
    features: {
      unlimitedCampaigns: "Campanhas ilimitadas",
      advancedAnalytics: "Estatisticas avancadas",
      prioritySupport: "Suporte prioritario",
      customBranding: "Marca personalizada",
      apiAccess: "Acesso a API",
      multiLocation: "Gestao de multiplas unidades",
      dedicatedManager: "Gerente de conta dedicado",
      slaGuarantee: "Garantia de SLA",
      basicAnalytics: "Estatisticas basicas",
      upToThreeCampaigns: "Ate 3 campanhas",
      communitySupport: "Suporte da comunidade",
    },
  },

  // ─── Common ──────────────────────────────────────────────────────────────
  common: {
    loading: "Carregando...",
    error: "Ocorreu um erro",
    success: "Pronto!",
    cancel: "Cancelar",
    save: "Salvar",
    delete: "Excluir",
    search: "Buscar",
    filter: "Filtrar",
    edit: "Editar",
    view: "Ver",
    back: "Voltar",
    next: "Proximo",
    previous: "Anterior",
    close: "Fechar",
    confirm: "Confirmar",
    retry: "Tentar novamente",
    noResults: "Nenhum resultado encontrado",
    showMore: "Mostrar mais",
    showLess: "Mostrar menos",
    selectAll: "Selecionar tudo",
    deselectAll: "Desmarcar tudo",
    sortBy: "Ordenar por",
    ascending: "Crescente",
    descending: "Decrescente",
    yes: "Sim",
    no: "Nao",
    or: "ou",
    and: "e",
    of: "de",
    to: "para",
    from: "de",
    all: "Todos",
    none: "Nenhum",
    welcome: "Bem-vindo, {{name}}!",
  },

  // ─── Errors ──────────────────────────────────────────────────────────────
  errors: {
    requiredField: "Este campo e obrigatorio",
    invalidEmail: "Insira um endereco de e-mail valido",
    passwordTooShort: "A senha deve ter pelo menos 8 caracteres",
    passwordMismatch: "As senhas nao coincidem",
    invalidUrl: "Insira uma URL valida",
    networkError: "Erro de rede. Verifique sua conexao.",
    serverError: "Erro do servidor. Tente novamente mais tarde.",
    unauthorized: "Voce nao tem permissao para realizar esta acao.",
    notFound: "O recurso solicitado nao foi encontrado.",
    rateLimited: "Muitas solicitacoes. Aguarde um momento.",
    invalidAmount: "Insira um valor valido",
    campaignFull: "Esta campanha atingiu o limite de participantes.",
    alreadyEnrolled: "Voce ja esta inscrito nesta campanha.",
    submissionFailed: "O envio falhou. Tente novamente.",
    fileTooLarge: "Arquivo muito grande. Tamanho maximo: {{size}}.",
    invalidFileType: "Tipo de arquivo invalido. Tipos permitidos: {{types}}.",
    sessionExpired: "Sua sessao expirou. Faca login novamente.",
  },

  // ─── Email Subjects ──────────────────────────────────────────────────────
  email: {
    welcomeSubject: "Bem-vindo ao Social Perks!",
    submissionApproved: "Seu envio foi aprovado!",
    submissionRejected: "Seu envio precisa de alteracoes",
    weeklyDigest: "Seu resumo semanal do Social Perks",
    payoutProcessed: "Seu pagamento foi processado",
    campaignLaunched: "Sua campanha esta no ar!",
    newSubmission: "Novo envio na sua campanha",
    accountVerified: "Sua conta foi verificada",
  },

  // ─── Perk / Wallet ──────────────────────────────────────────────────────
  perk: {
    earned: "Beneficio obtido",
    redeemed: "Resgatado",
    expired: "Expirado",
    walletBalance: "Saldo da carteira",
    redeemNow: "Resgatar agora",
    history: "Historico de transacoes",
    pending: "Pendente",
  },

  // ─── Tiers ───────────────────────────────────────────────────────────────
  tiers: {
    essential: "Essencial",
    highImpact: "Alto impacto",
    growth: "Crescimento",
    premium: "Premium",
    starter: "Iniciante",
  },

  // ─── Platforms ───────────────────────────────────────────────────────────
  platforms: {
    instagram: "Instagram",
    tiktok: "TikTok",
    youtube: "YouTube",
    twitter: "X (Twitter)",
    facebook: "Facebook",
    google: "Google",
    yelp: "Yelp",
    linkedin: "LinkedIn",
  },

  // ─── Time / Date ─────────────────────────────────────────────────────────
  time: {
    today: "Hoje",
    yesterday: "Ontem",
    daysAgo: "{{count}} dias atras",
    hoursAgo: "{{count}} horas atras",
    minutesAgo: "{{count}} minutos atras",
    justNow: "Agora mesmo",
  },

  // ─── Footer ──────────────────────────────────────────────────────────────
  footer: {
    product: "Produto",
    company: "Empresa",
    resources: "Recursos",
    legal: "Juridico",
    privacyPolicy: "Politica de privacidade",
    termsOfService: "Termos de servico",
    helpCenter: "Central de ajuda",
    blog: "Blog",
    about: "Sobre",
    careers: "Carreiras",
    copyright: "Todos os direitos reservados.",
  },
};

export default pt;
