// ============================================================
//  REPOSITORIO - CON FIRESTORE (Base de datos en la nube)
//  CATEGORÍAS ESTANDARIZADAS: 'vinilos', 'cds', 'equipos', 'accesorios'
// ============================================================

// 🔥 Inicializar Firebase
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyBkKpSEfcoL1A78B1bUpNzoLmlpsCKWItw',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'el-bunker-tienda.firebaseapp.com',
    projectId: process.env.FIREBASE_PROJECT_ID || 'el-bunker-tienda',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'el-bunker-tienda.firebasestorage.app',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '1060177723143',
    appId: process.env.FIREBASE_APP_ID || '1:1060177723143:web:f98e65cda0975daab78fa2'
};

// Inicializar Firebase solo si no está inicializado
if (!firebase.apps || !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();

const Repository = (function() {

    const KEYS = Config.LS_KEYS;
    let _productsCache = null;

    // ============================================================
    //  PRODUCTOS - FIRESTORE
    // ============================================================

    async function getProducts() {
        if (_productsCache !== null) {
            return _productsCache;
        }

        try {
            const snapshot = await db.collection('products').get();
            const productos = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                // Asegurar que imagesExtra sea array
                if (!data.imagesExtra) data.imagesExtra = [];
                // Si no tiene id, usar el id del documento
                if (!data.id) data.id = parseInt(doc.id) || doc.id;
                productos.push(data);
            });
            _productsCache = productos;
            return productos;
        } catch (error) {
            console.warn('Error al leer productos de Firestore:', error);
            // Fallback a localStorage si Firestore falla
            return getLocalProducts();
        }
    }

    async function saveProducts(productos) {
        try {
            // Guardar en Firestore
            const batch = db.batch();
            productos.forEach(producto => {
                const docRef = db.collection('products').doc(producto.id.toString());
                batch.set(docRef, producto);
            });
            await batch.commit();
            _productsCache = null;
            // También guardar en localStorage como backup
            saveLocalProducts(productos);
            return true;
        } catch (error) {
            console.error('Error al guardar productos en Firestore:', error);
            // Fallback a localStorage
            saveLocalProducts(productos);
            return false;
        }
    }

    function getProductById(id) {
        return getProducts().then(productos => 
            productos.find(p => p.id === id) || null
        );
    }

    async function addProduct(producto) {
        const productos = await getProducts();
        // Si no tiene id, generar uno
        if (!producto.id) {
            const maxId = productos.reduce((max, p) => Math.max(max, p.id || 0), 0);
            producto.id = maxId + 1;
        }
        productos.push(producto);
        await saveProducts(productos);
        return producto;
    }

    async function updateProduct(id, updatedData) {
        const productos = await getProducts();
        const index = productos.findIndex(p => p.id === id);
        if (index === -1) return null;
        productos[index] = { ...productos[index], ...updatedData };
        await saveProducts(productos);
        return productos[index];
    }

    async function deleteProduct(id) {
        let productos = await getProducts();
        productos = productos.filter(p => p.id !== id);
        await saveProducts(productos);
        return productos;
    }

    // ============================================================
    //  BACKUP LOCAL (FALLBACK)
    // ============================================================

    function getLocalProducts() {
        return getData(KEYS.PRODUCTOS, getDefaultProducts());
    }

    function saveLocalProducts(productos) {
        setData(KEYS.PRODUCTOS, productos);
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
            { id: 110, title: "Led Zeppelin – Led Zeppelin IV", priceNumber: 170.00, image: Config.DEFAULT_PLACEHOLDER_IMAGE, isSoldOut: false, quantity: 5, description: "Gatefold prensado especial.", starred: false, categoria: "vinilos", displayOrder: 10, imagesExtra: [] }
        ];
    }

    function getData(key, defaultValue) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    }

    function setData(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {}
    }

    // ============================================================
    //  CONFIGURACIONES
    // ============================================================

    async function getHeaderConfig() {
        try {
            const doc = await db.collection('config').doc('header').get();
            if (doc.exists) {
                return doc.data();
            }
        } catch (e) {}
        return getData(KEYS.HEADER_CONFIG, {
            tickerText: "Tenemos nuevos ingresos de Vinilos, CDs Equipos Vintage y Accesorios",
            m1: "VINILOS",
            m2: "CDs",
            m3: "EQUIPOS",
            m4: "ACCESORIOS"
        });
    }

    function saveHeaderConfig(config) {
        try {
            db.collection('config').doc('header').set(config);
        } catch (e) {}
        setData(KEYS.HEADER_CONFIG, config);
    }

    async function getCarouselConfig() {
        try {
            const doc = await db.collection('config').doc('carousel').get();
            if (doc.exists) {
                return doc.data();
            }
        } catch (e) {}
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
        try {
            db.collection('config').doc('carousel').set(config);
        } catch (e) {}
        setData(KEYS.CAROUSEL_CONFIG, config);
    }

    async function getCategoryConfig() {
        try {
            const doc = await db.collection('config').doc('categories').get();
            if (doc.exists) {
                return doc.data();
            }
        } catch (e) {}
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
        try {
            db.collection('config').doc('categories').set(config);
        } catch (e) {}
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
    //  ADMIN SESSION
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
