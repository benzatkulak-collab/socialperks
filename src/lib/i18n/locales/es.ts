// ══════════════════════════════════════════════════════════════════════════════
// Spanish (es) — Translations
// ══════════════════════════════════════════════════════════════════════════════

import type { TranslationStrings } from "../index";

const es: TranslationStrings = {
  // ─── Navigation ──────────────────────────────────────────────────────────
  nav: {
    home: "Inicio",
    pricing: "Precios",
    contact: "Contacto",
    howItWorks: "Como funciona",
    examples: "Ejemplos",
    login: "Iniciar sesion",
    signup: "Registrarse",
    getStarted: "Comenzar",
    logout: "Cerrar sesion",
    dashboard: "Panel",
    campaigns: "Campanas",
    earnings: "Ganancias",
    profile: "Perfil",
    settings: "Configuracion",
    discover: "Descubrir",
    analytics: "Estadisticas",
    wallet: "Billetera",
  },

  // ─── Hero / Landing ─────────────────────────────────────────────────────
  hero: {
    headline: "Convierte a tus clientes en tu equipo de marketing",
    subheadline:
      "Ofrece descuentos y recompensas a cambio de publicaciones en redes sociales, resenas y referidos. Funciona para cualquier negocio, sin importar el tamano.",
    cta: "Empieza gratis hoy",
    ctaSecondary: "Mira como funciona",
    trustedBy: "{{count}} negocios confian en nosotros",
  },

  // ─── Auth ────────────────────────────────────────────────────────────────
  auth: {
    login: "Iniciar sesion",
    signup: "Crear cuenta",
    email: "Correo electronico",
    password: "Contrasena",
    confirmPassword: "Confirmar contrasena",
    forgotPassword: "Olvidaste tu contrasena?",
    resetPassword: "Restablecer contrasena",
    resetPasswordSuccess: "Revisa tu correo para las instrucciones de restablecimiento.",
    rememberMe: "Recordarme",
    noAccount: "No tienes cuenta?",
    haveAccount: "Ya tienes cuenta?",
    orContinueWith: "O continuar con",
    verifyEmail: "Verifica tu correo",
    verifyEmailMessage: "Enviamos un enlace de verificacion a {{email}}.",
    welcomeBack: "Bienvenido de nuevo, {{name}}!",
  },

  // ─── Dashboard ───────────────────────────────────────────────────────────
  dashboard: {
    title: "Panel de control",
    campaign: "Campana",
    campaigns: "Campanas",
    submission: "Envio",
    submissions: "Envios",
    earnings: "Ganancias",
    wallet: "Billetera",
    profile: "Perfil",
    analytics: "Estadisticas",
    overview: "Resumen",
    recentActivity: "Actividad reciente",
    totalEarnings: "Ganancias totales",
    activeCampaigns: "Campanas activas",
    pendingReview: "Pendientes de revision",
    completionRate: "Tasa de finalizacion",
  },

  // ─── Business Portal ─────────────────────────────────────────────────────
  business: {
    createCampaign: "Crear campana",
    launchCampaign: "Lanzar campana",
    pauseCampaign: "Pausar campana",
    resumeCampaign: "Reanudar campana",
    endCampaign: "Finalizar campana",
    editCampaign: "Editar campana",
    campaignName: "Nombre de la campana",
    campaignDescription: "Descripcion de la campana",
    targetAudience: "Audiencia objetivo",
    budget: "Presupuesto",
    duration: "Duracion",
    perkValue: "Valor del beneficio",
    requiredActions: "Acciones requeridas",
    businessName: "Nombre del negocio",
    businessType: "Tipo de negocio",
    activeCampaigns: "Campanas activas",
    totalCompletions: "Finalizaciones totales",
    revenueGenerated: "Ingresos generados",
    customerReach: "Alcance de clientes",
    selectPlatform: "Seleccionar plataforma",
    campaignTier: "Nivel de campana",
    effortLevel: "Nivel de esfuerzo",
  },

  // ─── Influencer Portal ───────────────────────────────────────────────────
  influencer: {
    discover: "Descubrir campanas",
    submitProof: "Enviar prueba",
    earnings: "Mis ganancias",
    cashOut: "Retirar fondos",
    proofUrl: "URL de la prueba",
    proofDescription: "Describe lo que hiciste",
    followers: "Seguidores",
    engagementRate: "Tasa de interaccion",
    tier: "Nivel de influencer",
    rateCard: "Tarifa",
    portfolio: "Portafolio",
    pendingPayouts: "Pagos pendientes",
    totalCashOuts: "Total de retiros",
    availableBalance: "Saldo disponible",
    completedCampaigns: "Campanas completadas",
  },

  // ─── Pricing ─────────────────────────────────────────────────────────────
  pricing: {
    title: "Precios simples y transparentes",
    subtitle: "Empieza gratis y crece a tu ritmo.",
    free: "Gratuito",
    pro: "Profesional",
    enterprise: "Empresarial",
    monthly: "Mensual",
    annual: "Anual",
    perMonth: "/mes",
    billedAnnually: "Facturado anualmente",
    currentPlan: "Plan actual",
    upgrade: "Mejorar plan",
    downgrade: "Reducir plan",
    contactSales: "Contactar ventas",
    features: {
      unlimitedCampaigns: "Campanas ilimitadas",
      advancedAnalytics: "Estadisticas avanzadas",
      prioritySupport: "Soporte prioritario",
      customBranding: "Marca personalizada",
      apiAccess: "Acceso a la API",
      multiLocation: "Gestion de multiples ubicaciones",
      dedicatedManager: "Gerente de cuenta dedicado",
      slaGuarantee: "Garantia de SLA",
      basicAnalytics: "Estadisticas basicas",
      upToThreeCampaigns: "Hasta 3 campanas",
      communitySupport: "Soporte comunitario",
    },
  },

  // ─── Common ──────────────────────────────────────────────────────────────
  common: {
    loading: "Cargando...",
    error: "Ocurrio un error",
    success: "Listo!",
    cancel: "Cancelar",
    save: "Guardar",
    delete: "Eliminar",
    search: "Buscar",
    filter: "Filtrar",
    edit: "Editar",
    view: "Ver",
    back: "Atras",
    next: "Siguiente",
    previous: "Anterior",
    close: "Cerrar",
    confirm: "Confirmar",
    retry: "Reintentar",
    noResults: "No se encontraron resultados",
    showMore: "Mostrar mas",
    showLess: "Mostrar menos",
    selectAll: "Seleccionar todo",
    deselectAll: "Deseleccionar todo",
    sortBy: "Ordenar por",
    ascending: "Ascendente",
    descending: "Descendente",
    yes: "Si",
    no: "No",
    or: "o",
    and: "y",
    of: "de",
    to: "a",
    from: "de",
    all: "Todos",
    none: "Ninguno",
    welcome: "Bienvenido, {{name}}!",
  },

  // ─── Errors ──────────────────────────────────────────────────────────────
  errors: {
    requiredField: "Este campo es obligatorio",
    invalidEmail: "Ingresa un correo electronico valido",
    passwordTooShort: "La contrasena debe tener al menos 8 caracteres",
    passwordMismatch: "Las contrasenas no coinciden",
    invalidUrl: "Ingresa una URL valida",
    networkError: "Error de red. Revisa tu conexion.",
    serverError: "Error del servidor. Intenta de nuevo mas tarde.",
    unauthorized: "No tienes permiso para realizar esta accion.",
    notFound: "El recurso solicitado no fue encontrado.",
    rateLimited: "Demasiadas solicitudes. Espera un momento.",
    invalidAmount: "Ingresa un monto valido",
    campaignFull: "Esta campana alcanzo su limite de participantes.",
    alreadyEnrolled: "Ya estas inscrito en esta campana.",
    submissionFailed: "El envio fallo. Intenta de nuevo.",
    fileTooLarge: "El archivo es muy grande. Tamano maximo: {{size}}.",
    invalidFileType: "Tipo de archivo no valido. Tipos permitidos: {{types}}.",
    sessionExpired: "Tu sesion ha expirado. Inicia sesion de nuevo.",
  },

  // ─── Email Subjects ──────────────────────────────────────────────────────
  email: {
    welcomeSubject: "Bienvenido a Social Perks!",
    submissionApproved: "Tu envio ha sido aprobado!",
    submissionRejected: "Tu envio necesita cambios",
    weeklyDigest: "Tu resumen semanal de Social Perks",
    payoutProcessed: "Tu pago ha sido procesado",
    campaignLaunched: "Tu campana esta activa!",
    newSubmission: "Nuevo envio en tu campana",
    accountVerified: "Tu cuenta ha sido verificada",
  },

  // ─── Status Labels ─────────────────────────────────────────────────────
  status: {
    active: "Activo",
    paused: "Pausado",
    completed: "Completado",
    pending: "Pendiente",
    approved: "Aprobado",
    rejected: "Rechazado",
    ended: "Finalizado",
    expired: "Expirado",
    draft: "Borrador",
  },

  // ─── Pluralization examples ───────────────────────────────────────────
  items_zero: "Sin elementos",
  items_one: "{{count}} elemento",
  items_other: "{{count}} elementos",
  campaigns_count_zero: "Sin campanas",
  campaigns_count_one: "{{count}} campana",
  campaigns_count_other: "{{count}} campanas",
  submissions_count_zero: "Sin envios",
  submissions_count_one: "{{count}} envio",
  submissions_count_other: "{{count}} envios",
  days_zero: "Sin dias",
  days_one: "{{count}} dia",
  days_other: "{{count}} dias",

  // ─── Perk / Wallet ──────────────────────────────────────────────────────
  perk: {
    earned: "Beneficio obtenido",
    redeemed: "Canjeado",
    expired: "Expirado",
    walletBalance: "Saldo de billetera",
    redeemNow: "Canjear ahora",
    history: "Historial de transacciones",
    pending: "Pendiente",
  },

  // ─── Tiers ───────────────────────────────────────────────────────────────
  tiers: {
    essential: "Esencial",
    highImpact: "Alto impacto",
    growth: "Crecimiento",
    premium: "Premium",
    starter: "Inicial",
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
    today: "Hoy",
    yesterday: "Ayer",
    daysAgo: "Hace {{count}} dias",
    hoursAgo: "Hace {{count}} horas",
    minutesAgo: "Hace {{count}} minutos",
    justNow: "Justo ahora",
  },

  // ─── Footer ──────────────────────────────────────────────────────────────
  footer: {
    product: "Producto",
    company: "Empresa",
    resources: "Recursos",
    legal: "Legal",
    privacyPolicy: "Politica de privacidad",
    termsOfService: "Terminos de servicio",
    helpCenter: "Centro de ayuda",
    blog: "Blog",
    about: "Acerca de",
    careers: "Empleos",
    copyright: "Todos los derechos reservados.",
  },
};

export default es;
