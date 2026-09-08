// ============================================================
//  CONFIG - Configuración centralizada
//  Contiene todas las constantes, claves API y valores por defecto.
// ============================================================

const Config = {
    // --- API ImgBB ---
    IMG_BB_API_KEY: '5d37a7904ca0e4f184ddbe7d8fd96f2b',
    IMG_BB_UPLOAD_URL: 'https://api.imgbb.com/1/upload',

    // --- Credenciales de administrador ---
    // TODO FASE 6: Reemplazar por Firebase Auth
    ADMIN_USERNAME: 'admin',
    ADMIN_PASSWORD: '1234',

    // --- Valores de la tienda ---
    SHIPPING_COST: 10,
    ITEMS_PER_PAGE: 12,
    MAX_STARRED_PER_CATEGORY: 12,

    // --- Imagen por defecto (placeholder) ---
    DEFAULT_PLACEHOLDER_IMAGE: 'https://images.unsplash.com/photo-1539321908154-04927596764d?q=80&w=500&auto=format&fit=crop',

    // --- Nombres de categorías (estandarizados) ---
    CATEGORIAS: {
        VINILOS: 'vinilos',
        CDS: 'cds',
        EQUIPOS: 'equipos',
        ACCESORIOS: 'accesorios'
    },

    // --- Arreglo de categorías para iteración ---
    CATEGORIAS_LISTA: ['vinilos', 'cds', 'equipos', 'accesorios'],

    // --- Claves de localStorage ---
    LS_KEYS: {
        PRODUCTOS: 'bunker_productos_db',
        HEADER_CONFIG: 'bunker_header_config',
        CAROUSEL_CONFIG: 'bunker_carousel_config',
        CATEGORY_CONFIG: 'bunker_category_config',
        CART: 'bunker_cart',
        ADMIN_SESSION: 'bunker_esAdmin'
    }
};