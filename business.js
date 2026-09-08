// ============================================================
//  BUSINESS - Lógica de negocio (Carrito, Productos, Configuraciones)
//  Usa el repositorio para leer/escribir datos.
//  CATEGORÍAS ESTANDARIZADAS: 'vinilos', 'cds', 'equipos', 'accesorios'
// ============================================================

const Business = (function() {

    let _productsCache = null;
    let _headerConfigCache = null;
    let _carouselConfigCache = null;
    let _categoryConfigCache = null;

    // ============================================================
    //  CARRITO
    // ============================================================
    function getCart() {
        return Repository.getCart();
    }

    function saveCart(cart) {
        Repository.saveCart(cart);
        if (window.UI && typeof window.UI.updateCartUI === 'function') {
            window.UI.updateCartUI();
        }
    }

    function addToCart(producto) {
        if (producto.isSoldOut || (producto.quantity !== undefined && producto.quantity <= 0)) {
            window.UI.showToast(`El producto "<b>${producto.title}</b>" se encuentra agotado.`, 'error');
            return false;
        }

        let cart = getCart();
        const existingIndex = cart.findIndex(item => item.title === producto.title);
        if (existingIndex > -1) {
            cart[existingIndex].quantity += 1;
        } else {
            cart.push({
                title: producto.title,
                price: producto.priceNumber,
                image: producto.image,
                quantity: 1
            });
        }
        saveCart(cart);
        window.UI.showToast(`"<b>${producto.title}</b>" se agregó al carrito con éxito.`, 'success');
        return true;
    }

    function removeCartItem(index) {
        let cart = getCart();
        cart.splice(index, 1);
        saveCart(cart);
    }

    function changeCartQty(index, delta) {
        let cart = getCart();
        cart[index].quantity += delta;
        if (cart[index].quantity <= 0) {
            cart.splice(index, 1);
        }
        saveCart(cart);
    }

    function getCartSubtotal() {
        const cart = getCart();
        return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    function getCartTotal(shippingCost = Config.SHIPPING_COST) {
        const subtotal = getCartSubtotal();
        return subtotal > 0 ? subtotal + shippingCost : 0;
    }

    // ============================================================
    //  PRODUCTOS
    // ============================================================
    async function getProducts() {
        if (_productsCache !== null) {
            return _productsCache;
        }
        _productsCache = await Repository.getProducts();
        return _productsCache;
    }

    function getProductById(id) {
        return Repository.getProductById(id);
    }

    async function getProductsByCategory(categoria) {
        const productos = await getProducts();
        return productos.filter(p => p.categoria === categoria)
                       .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    }

    async function addProduct(productData) {
        const productos = await getProducts();
        const categoria = productData.categoria;
        const catProducts = productos.filter(p => p.categoria === categoria);

        catProducts.forEach(p => {
            p.displayOrder = (p.displayOrder || 0) + 1;
        });

        const newId = productos.length > 0 ? Math.max(...productos.map(p => p.id)) + 1 : 1;
        const newProduct = { 
            ...productData, 
            id: newId, 
            displayOrder: 1 
        };

        productos.push(newProduct);
        Repository.saveProducts(productos);
        _productsCache = null;
        return newProduct;
    }

    async function updateProduct(id, updatedData) {
        const result = Repository.updateProduct(id, updatedData);
        _productsCache = null;
        return result;
    }

    async function deleteProduct(id) {
        Repository.deleteProduct(id);
        _productsCache = null;
        return true;
    }

    // ============================================================
    //  ADMINISTRACIÓN (Feature Toggle)
    //  TODO FASE 6: Reemplazar por Firebase Auth
    // ============================================================
    
    function esAdmin() {
        return getAdminSession();
    }

    function getAdminSession() {
        return Repository.getAdminSession();
    }

    function saveAdminSession(value) {
        Repository.saveAdminSession(value);
    }

    async function toggleStarProduct(id) {
        const isAdmin = esAdmin();
        if (!isAdmin) {
            window.UI.showToast('No tienes permisos para realizar esta acción.', 'error');
            return false;
        }

        const productos = await getProducts();
        const prod = productos.find(p => p.id === id);
        if (!prod) return false;

        if (!prod.starred) {
            const currentStarredCount = productos.filter(p => p.starred && p.categoria === prod.categoria).length;
            if (currentStarredCount >= Config.MAX_STARRED_PER_CATEGORY) {
                window.UI.showToast(`Solo se permite activar un máximo de ${Config.MAX_STARRED_PER_CATEGORY} productos destacados por categoría.`, "error");
                return false;
            }
            prod.starred = true;
            window.UI.showToast("Producto agregado a destacados en inicio.", "success");
        } else {
            prod.starred = false;
            window.UI.showToast("Producto removido de destacados.", "info");
        }
        Repository.saveProducts(productos);
        _productsCache = null;
        return true;
    }

    async function moveProductUp(id, categoria) {
        const prodCategoria = await getProductsByCategory(categoria);
        const idx = prodCategoria.findIndex(p => p.id === id);
        if (idx <= 0) return false;
        const current = prodCategoria[idx];
        const prev = prodCategoria[idx - 1];
        const tempOrder = current.displayOrder;
        current.displayOrder = prev.displayOrder;
        prev.displayOrder = tempOrder;
        const productos = await getProducts();
        const prodGlobal = productos.find(p => p.id === id);
        const prevGlobal = productos.find(p => p.id === prev.id);
        if (prodGlobal) prodGlobal.displayOrder = current.displayOrder;
        if (prevGlobal) prevGlobal.displayOrder = prev.displayOrder;
        Repository.saveProducts(productos);
        _productsCache = null;
        return true;
    }

    async function moveProductDown(id, categoria) {
        const prodCategoria = await getProductsByCategory(categoria);
        const idx = prodCategoria.findIndex(p => p.id === id);
        if (idx === -1 || idx >= prodCategoria.length - 1) return false;
        const current = prodCategoria[idx];
        const next = prodCategoria[idx + 1];
        const tempOrder = current.displayOrder;
        current.displayOrder = next.displayOrder;
        next.displayOrder = tempOrder;
        const productos = await getProducts();
        const prodGlobal = productos.find(p => p.id === id);
        const nextGlobal = productos.find(p => p.id === next.id);
        if (prodGlobal) prodGlobal.displayOrder = current.displayOrder;
        if (nextGlobal) nextGlobal.displayOrder = next.displayOrder;
        Repository.saveProducts(productos);
        _productsCache = null;
        return true;
    }

    function setProductMainImage(productId, newMainUrl) {
        const productos = Repository.getData(Config.LS_KEYS.PRODUCTOS, []);
        const product = productos.find(p => p.id === productId);
        if (!product) return false;
        if (product.image === newMainUrl) return false;
        const index = product.imagesExtra.indexOf(newMainUrl);
        if (index === -1) return false;
        const oldMain = product.image;
        product.image = newMainUrl;
        product.imagesExtra[index] = oldMain;
        Repository.saveProducts(productos);
        _productsCache = null;
        return true;
    }

    function moveExtraImageUp(productId, index) {
        const productos = Repository.getData(Config.LS_KEYS.PRODUCTOS, []);
        const product = productos.find(p => p.id === productId);
        if (!product) return false;
        const extras = product.imagesExtra || [];
        if (index <= 0 || index >= extras.length) return false;
        [extras[index], extras[index - 1]] = [extras[index - 1], extras[index]];
        product.imagesExtra = extras;
        Repository.saveProducts(productos);
        _productsCache = null;
        return true;
    }

    function moveExtraImageDown(productId, index) {
        const productos = Repository.getData(Config.LS_KEYS.PRODUCTOS, []);
        const product = productos.find(p => p.id === productId);
        if (!product) return false;
        const extras = product.imagesExtra || [];
        if (index < 0 || index >= extras.length - 1) return false;
        [extras[index], extras[index + 1]] = [extras[index + 1], extras[index]];
        product.imagesExtra = extras;
        Repository.saveProducts(productos);
        _productsCache = null;
        return true;
    }

    function deleteExtraImage(productId, url) {
        const productos = Repository.getData(Config.LS_KEYS.PRODUCTOS, []);
        const product = productos.find(p => p.id === productId);
        if (!product) return false;
        const extras = product.imagesExtra || [];
        const index = extras.indexOf(url);
        if (index === -1) return false;
        extras.splice(index, 1);
        product.imagesExtra = extras;
        Repository.saveProducts(productos);
        _productsCache = null;
        return true;
    }

    // ============================================================
    //  CONFIGURACIONES
    // ============================================================
    async function getHeaderConfig() {
        if (_headerConfigCache !== null) return _headerConfigCache;
        _headerConfigCache = await Repository.getHeaderConfig();
        return _headerConfigCache;
    }

    function saveHeaderConfig(config) {
        Repository.saveHeaderConfig(config);
        _headerConfigCache = config;
    }

    async function getCarouselConfig() {
        if (_carouselConfigCache !== null) return _carouselConfigCache;
        _carouselConfigCache = await Repository.getCarouselConfig();
        return _carouselConfigCache;
    }

    function saveCarouselConfig(config) {
        Repository.saveCarouselConfig(config);
        _carouselConfigCache = config;
    }

    async function getCategoryConfig() {
        if (_categoryConfigCache !== null) return _categoryConfigCache;
        _categoryConfigCache = await Repository.getCategoryConfig();
        return _categoryConfigCache;
    }

    function saveCategoryConfig(config) {
        Repository.saveCategoryConfig(config);
        _categoryConfigCache = config;
    }

    // ============================================================
    //  BÚSQUEDA GLOBAL
    // ============================================================
    async function performGlobalSearch(query) {
        if (!query || query.trim() === '') return [];
        const productos = await getProducts();
        return productos.filter(p => p.title.toLowerCase().includes(query.toLowerCase().trim()));
    }

    // ============================================================
    //  SUBIDA DE IMÁGENES - DELEGADO A UI
    // ============================================================
    async function processImageFile(file) {
        return UI.processImageFile(file);
    }

    // ============================================================
    //  EXPOSICIÓN PÚBLICA
    // ============================================================
    return {
        getCart,
        saveCart,
        addToCart,
        removeCartItem,
        changeCartQty,
        getCartSubtotal,
        getCartTotal,
        getProducts,
        getProductById,
        getProductsByCategory,
        addProduct,
        updateProduct,
        deleteProduct,
        toggleStarProduct,
        moveProductUp,
        moveProductDown,
        setProductMainImage,
        moveExtraImageUp,
        moveExtraImageDown,
        deleteExtraImage,
        getHeaderConfig,
        saveHeaderConfig,
        getCarouselConfig,
        saveCarouselConfig,
        getCategoryConfig,
        saveCategoryConfig,
        esAdmin,
        getAdminSession,
        saveAdminSession,
        performGlobalSearch,
        processImageFile
    };
})();