// ============================================================
//  REPOSITORIO - Capa de Acceso a Datos (DAL)
//  TODAS las categorías usan minúsculas: 'vinilos', 'cds', 'equipos', 'accesorios'
// ============================================================

const Repository = (function() {

    const KEYS = Config.LS_KEYS;

    function getData(key, defaultValue) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.warn(`Error al leer ${key}:`, e);
            return defaultValue;
        }
    }

    function setData(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error(`Error al guardar ${key}:`, e);
        }
    }

    function simulateLatency(ms = 400) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function getDefaultProducts() {
        return [
            { id: 101, title: "Lana Del Rey – Born To Die", priceNumber: 165.00, image: Config.DEFAULT_PLACEHOLDER_IMAGE, isSoldOut: false, quantity: 5, description: "Vinilo Edición Especial.", starred: true, categoria: "vinilos", displayOrder: 1, imagesExtra: [] },
            { id: 102, title: "Selena – Ones (2 LP's)", priceNumber: 185.00, image: Config.DEFAULT_PLACEHOLDER_IMAGE, isSoldOut: false, quantity: 2, description: "Compilación 2 LPs Vinilo.", starred: true, categoria: "vinilos", displayOrder: 2, imagesExtra: [] },
            { id: 103, title: "Pink Floyd – The Dark Side Of The Moon", priceNumber: 195.00, image: Config.DEFAULT_PLACEHOLDER_IMAGE, isSoldOut: false, quantity: 3, description: "Vinilo clásico progresivo.", starred: true, categoria: "vinilos", displayOrder: 3, imagesExtra: [] },
            { id: 104, title: "Nirvana – Nevermind JP Edition", priceNumber: 210.00, image: Config.DEFAULT_PLACEHOLDER_IMAGE, isSoldOut: false, quantity: 4, description: "Edición Japonesa con OBI.", starred: true, categoria: "vinilos", displayOrder: 4, imagesExtra: [] },
            { id: 105, title: "Iron Maiden – The Number Of The Beast", priceNumber: 175.00, image: Config.DEFAULT_PLACEHOLDER_IMAGE, isSoldOut: false, quantity: 6, description: "Edición 180g Heavy Metal.", starred: false, categoria: "vinilos", displayOrder: 5, imagesExtra: [] },
            { id: 106, title: "Metallica – Master Of Puppets", priceNumber: 190.00, image: Config.DEFAULT_PLACEHOLDER_IMAGE, isSoldOut: false, quantity: 3, description: "Remasterizado Vinilo de 180g.", starred: false, categoria: "vinilos", displayOrder: 6, imagesExtra: [] },
            { id: 107, title: "AC/DC – Back In Black", priceNumber: 160.00, image: Config.DEFAULT_PLACEHOLDER_IMAGE, isSoldOut: false, quantity: 8, description: "Álbum clásico del rock.", starred: false, categoria: "vinilos", displayOrder: 7, imagesExtra: [] },
            { id: 108, title: "Guns N' Roses – Appetite For Destruction", priceNumber: 180.00, image: Config.DEFAULT_PLACEHOLDER_IMAGE, isSoldOut: false, quantity: 4, description: "Edición estándar en Vinilo.", starred: false, categoria: "vinilos", displayOrder: 8, imagesExtra: [] },
            { id: 109, title: "Queen – A Night At The Opera JP", priceNumber: 220.00, image: Config.DEFAULT_PLACEHOLDER_IMAGE, isSoldOut: false, quantity: 2, description: "Japón JP con inserto y OBI.", starred: false, categoria: "vinilos", displayOrder: 9, imagesExtra: [] },
            { id: 110, title: "Led Zeppelin – Led Zeppelin IV", priceNumber: 170.00, image: Config.DEFAULT_PLACEHOLDER_IMAGE, isSoldOut: false, quantity: 5, description: "Gatefold prensado especial.", starred: false, categoria: "vinilos", displayOrder: 10, imagesExtra: [] },
            { id: 201, title: "Daft Punk – Random Access Memories (CD)", priceNumber: 85.00, image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=500&auto=format&fit=crop", isSoldOut: false, quantity: 5, description: "CD Edición Japonesa con OBI.", starred: true, categoria: "cds", displayOrder: 1, imagesExtra: [] },
            { id: 202, title: "Michael Jackson – Thriller (CD JP)", priceNumber: 95.00, image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=500&auto=format&fit=crop", isSoldOut: false, quantity: 3, description: "CD Edición Japonesa remasterizada.", starred: true, categoria: "cds", displayOrder: 2, imagesExtra: [] },
            { id: 301, title: "Tornamesa Technics SL-1200MK2", priceNumber: 2400.00, image: "https://images.unsplash.com/photo-1550684376-efcbd6e3f031?q=80&w=500&auto=format&fit=crop", isSoldOut: false, quantity: 1, description: "Tornamesa analógica profesional restaurada.", starred: true, categoria: "equipos", displayOrder: 1, imagesExtra: [] },
            { id: 401, title: "Cepillo Antiestático de Fibra de Carbono", priceNumber: 45.00, image: "https://images.unsplash.com/photo-1583223667759-6c38b693e506?q=80&w=500&auto=format&fit=crop", isSoldOut: false, quantity: 10, description: "Cepillo pro para limpieza de discos de vinilo.", starred: true, categoria: "accesorios", displayOrder: 1, imagesExtra: [] }
        ];
    }

    // ============================================================
    //  PRODUCTOS
    // ============================================================
    async function getProducts() {
        await simulateLatency(400);
        let productos = getData(KEYS.PRODUCTOS, null);
        if (!productos || !Array.isArray(productos) || productos.length === 0) {
            productos = getDefaultProducts();
            setData(KEYS.PRODUCTOS, productos);
        } else {
            let changed = false;
            productos.forEach(p => {
                if (!p.imagesExtra) {
                    p.imagesExtra = [];
                    changed = true;
                }
            });
            if (changed) setData(KEYS.PRODUCTOS, productos);
        }
        return productos;
    }

    function saveProducts(productos) {
        setData(KEYS.PRODUCTOS, productos);
    }

    function getProductById(id) {
        const productos = getData(KEYS.PRODUCTOS, []);
        return productos.find(p => p.id === id) || null;
    }

    function addProduct(producto) {
        const productos = getData(KEYS.PRODUCTOS, []);
        productos.push(producto);
        saveProducts(productos);
        return producto;
    }

    function updateProduct(id, updatedData) {
        const productos = getData(KEYS.PRODUCTOS, []);
        const index = productos.findIndex(p => p.id === id);
        if (index === -1) return null;
        productos[index] = { ...productos[index], ...updatedData };
        saveProducts(productos);
        return productos[index];
    }

    function deleteProduct(id) {
        let productos = getData(KEYS.PRODUCTOS, []);
        productos = productos.filter(p => p.id !== id);
        saveProducts(productos);
        return productos;
    }

    // ============================================================
    //  CONFIGURACIONES
    // ============================================================
    async function getHeaderConfig() {
        await simulateLatency(300);
        return getData(KEYS.HEADER_CONFIG, {
            tickerText: "Tenemos nuevos ingresos de Vinilos, CDs Equipos Vintage y Accesorios",
            m1: "VINILOS",
            m2: "CDs",
            m3: "EQUIPOS",
            m4: "ACCESORIOS"
        });
    }

    function saveHeaderConfig(config) {
        setData(KEYS.HEADER_CONFIG, config);
    }

    async function getCarouselConfig() {
        await simulateLatency(300);
        return getData(KEYS.CAROUSEL_CONFIG, {
            count: 6,
            slides: [
                { img: "car1.png", title: "ROCK & METAL LEGENDS" },
                { img: "car2.png", title: "NUEVOS INGRESOS JP" },
                { img: "car3.png", title: "" },
                { img: "car4.png", title: "EDICIONES LIMITADAS" },
                { img: "car5.png", title: "EQUIPOS VINTAGE HIFI" },
                { img: "car6.png", title: "" }
            ]
        });
    }

    function saveCarouselConfig(config) {
        setData(KEYS.CAROUSEL_CONFIG, config);
    }

    async function getCategoryConfig() {
        await simulateLatency(300);
        return getData(KEYS.CATEGORY_CONFIG, {
            items: [
                { title: "VINILOS JP", sub: "Nuevos Ingresos de Vinilos", img: "cat1.jpg" },
                { title: "CDs JP", sub: "Nuevos Ingresos de CDs", img: "cat2.jpg" },
                { title: "EQUIPOS JP", sub: "Nuevos Ingresos de Equipos Vintage", img: "cat3.jpg" },
                { title: "ACCESORIOS JP", sub: "Nuevos Ingresos de Accesorios", img: "cat4.jpg" }
            ]
        });
    }

    function saveCategoryConfig(config) {
        setData(KEYS.CATEGORY_CONFIG, config);
    }

    // ============================================================
    //  CARRITO
    // ============================================================
    function getCart() {
        return getData(KEYS.CART, []);
    }

    function saveCart(cart) {
        setData(KEYS.CART, cart);
    }

    // ============================================================
    //  ADMINISTRACIÓN (Feature Toggle)
    //  TODO FASE 6: Reemplazar por Firebase Auth
    // ============================================================
    function getAdminSession() {
        return getData(KEYS.ADMIN_SESSION, false);
    }

    function saveAdminSession(value) {
        setData(KEYS.ADMIN_SESSION, value);
    }

    // ============================================================
    //  EXPOSICIÓN PÚBLICA
    // ============================================================
    return {
        getProducts,
        saveProducts,
        getProductById,
        addProduct,
        updateProduct,
        deleteProduct,
        getHeaderConfig,
        saveHeaderConfig,
        getCarouselConfig,
        saveCarouselConfig,
        getCategoryConfig,
        saveCategoryConfig,
        getCart,
        saveCart,
        getAdminSession,
        saveAdminSession,
        getData,
        setData
    };
})();