// ============================================================
//  SCRIPT - Orquestador principal
//  Inicializa la aplicación de forma asíncrona.
//  CATEGORÍAS ESTANDARIZADAS: 'vinilos', 'cds', 'equipos', 'accesorios'
//  TODO FASE 6: Reemplazar por Firebase Auth
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {

    const spinner = document.getElementById('loadingSpinner');
    // Ocultar todo el contenido mientras carga
    document.body.classList.add('loading');
    if (spinner) {
        spinner.style.display = 'flex';
        spinner.classList.add('active');
    }

    try {
        const headerConfig = await Business.getHeaderConfig();
        const carouselConfig = await Business.getCarouselConfig();
        const categoryConfig = await Business.getCategoryConfig();
        await Business.getProducts();

        // ============================================================
        //  ADMINISTRACIÓN (Feature Toggle)
        //  TODO FASE 6: Reemplazar por Firebase Auth
        // ============================================================
        let esAdmin = Business.getAdminSession();
        let currentPage = 1;
        const ITEMS_PER_PAGE = Config.ITEMS_PER_PAGE;
        let categoriaActual = '';
        const CATEGORIAS = Config.CATEGORIAS_LISTA;

        // ============================================================
        //  FUNCIONES DE VISIBILIDAD ADMIN
        // ============================================================
        function actualizarVisibilidadAdmin() {
            const adminElements = document.querySelectorAll('.acciones-admin');
            adminElements.forEach(el => {
                if (esAdmin) {
                    el.classList.add('visible');
                } else {
                    el.classList.remove('visible');
                }
            });
            const loginBtn = document.getElementById('loginAdminBtn');
            const logoutBtn = document.getElementById('logoutAdminBtn');
            if (loginBtn) loginBtn.style.display = esAdmin ? 'none' : 'block';
            if (logoutBtn) logoutBtn.style.display = esAdmin ? 'block' : 'none';
            if (categoriaActual) {
                renderCatalogPage();
            }
            if (document.getElementById('productGrid')) {
                renderFeaturedTabs();
            }
        }

        // ============================================================
        //  FUNCIONES DE RENDERIZADO
        // ============================================================
        async function renderCatalogPage() {
            const productos = await Business.getProductsByCategory(categoriaActual);
            UI.renderCatalog(productos, currentPage, ITEMS_PER_PAGE, esAdmin, categoriaActual);
            window._catalogPageChangeCallback = (page) => {
                currentPage = page;
                renderCatalogPage();
                window.scrollTo({ top: 300, behavior: 'smooth' });
            };
        }

        async function renderFeaturedTabs() {
            const activeTab = document.querySelector('.tab-item.active');
            const tabIndex = activeTab ? parseInt(activeTab.dataset.index) : 0;
            const cat = CATEGORIAS[tabIndex];
            const allProducts = await Business.getProducts();
            const productos = allProducts.filter(p => p.categoria === cat)
                                 .sort((a,b) => (a.displayOrder||0) - (b.displayOrder||0));
            UI.renderFeatured(productos, tabIndex);
        }

        async function renderAdminList() {
            const productos = await Business.getProductsByCategory(categoriaActual);
            UI.renderAdminList(productos, categoriaActual, (id) => {
                openEditModal(id);
            });
        }

        // ============================================================
        //  FUNCIONES GLOBALES - DEFINIDAS UNA SOLA VEZ PARA TODAS LAS PÁGINAS
        // ============================================================
        window.openProductModal = function(id) {
            const product = Business.getProductById(id);
            if (product) UI.openProductModal(product);
        };

        window.Business = Business;
        window.UI = UI;
        window.addToCart = Business.addToCart;
        window.removeCartItem = Business.removeCartItem;
        window.changeCartQty = Business.changeCartQty;
        window.toggleStarProduct = Business.toggleStarProduct;
        window.deleteProduct = Business.deleteProduct;
        window.moveProductUp = Business.moveProductUp;
        window.moveProductDown = Business.moveProductDown;
        window.setProductMainImage = Business.setProductMainImage;
        window.moveExtraImageUp = Business.moveExtraImageUp;
        window.moveExtraImageDown = Business.moveExtraImageDown;
        window.deleteExtraImage = Business.deleteExtraImage;
        window.closeToastModal = UI.closeToast;

        // ============================================================
        //  EVENTOS GLOBALES
        // ============================================================
        document.addEventListener('keydown', (e) => {
            const productModal = document.getElementById('productModal');
            if (productModal && productModal.classList.contains('active')) {
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    UI.prevProductImage();
                    return;
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    UI.nextProductImage();
                    return;
                }
            }
            
            if (e.key === 'Escape' || e.key === 'Esc') {
                UI.closeToast();
                UI.closeProductModal();
                UI.closeSearchModal();
                document.querySelectorAll('.admin-modal-overlay.active, .cart-modal-overlay.active').forEach(m => m.classList.remove('active'));
                const addModal = document.getElementById('addProductModal');
                if (addModal && addModal.classList.contains('active')) resetAddProductForm();
                const editModal = document.getElementById('editProductModal');
                if (editModal && editModal.classList.contains('active')) editModal.classList.remove('active');
            }
        });

        // --- Cerrar anuncio ---
        document.getElementById('closeAnnouncement')?.addEventListener('click', () => {
            document.getElementById('announcementBar').style.display = 'none';
        });

        // --- Menú de usuario ---
        const userMenuBtn = document.getElementById('userMenuBtn');
        const userMenuContainer = userMenuBtn ? userMenuBtn.closest('.user-menu-dropdown') : null;
        if (userMenuBtn && userMenuContainer) {
            userMenuBtn.addEventListener('click', (e) => { e.stopPropagation(); userMenuContainer.classList.toggle('active'); });
            document.addEventListener('click', () => userMenuContainer.classList.remove('active'));
        }

        // --- Carrito ---
        const cartModal = document.getElementById('cartModal');
        document.getElementById('openCartModalBtn')?.addEventListener('click', () => {
            UI.updateCartUI();
            cartModal.classList.add('active');
        });
        document.getElementById('closeCartModal')?.addEventListener('click', () => cartModal.classList.remove('active'));
        cartModal?.addEventListener('click', (e) => { if (e.target === cartModal) cartModal.classList.remove('active'); });

        document.querySelectorAll('input[name="shippingMethod"]').forEach(r => r.addEventListener('change', UI.updateCartUI));

        // --- Finalizar compra ---
        document.getElementById('btnFinalizePurchase')?.addEventListener('click', () => {
            const cart = Business.getCart();
            if (cart.length === 0) {
                UI.showToast('El carrito está vacío.', 'error');
                return;
            }
            let text = "¡Hola EL BUNKER! Quisiera realizar el siguiente pedido:\n\n";
            let subtotal = 0;
            cart.forEach(item => {
                const itemSub = item.price * item.quantity;
                subtotal += itemSub;
                text += `• ${item.title} x${item.quantity} - S/ ${itemSub.toFixed(2)}\n`;
            });
            const shippingOption = document.querySelector('input[name="shippingMethod"]:checked');
            const shippingCost = shippingOption ? parseFloat(shippingOption.value) : Config.SHIPPING_COST;
            const shippingText = shippingCost === Config.SHIPPING_COST ? "Delivery (S/ 10.00)" : "Recojo en Tienda";
            const total = subtotal + shippingCost;
            text += `\n*Subtotal:* S/ ${subtotal.toFixed(2)}`;
            text += `\n*Envío:* ${shippingText}`;
            text += `\n*Total a pagar:* S/ ${total.toFixed(2)}`;
            window.open(`https://wa.me/51923386655?text=${encodeURIComponent(text)}`, '_blank');
        });

        // --- Búsqueda global ---
        const globalSearchInput = document.getElementById('globalSearchInput');
        const globalSearchBtn = document.getElementById('globalSearchBtn');
        function handleSearch() {
            const query = globalSearchInput.value.trim();
            if (!query) return;
            Business.performGlobalSearch(query).then(results => {
                UI.showSearchResults(results);
            });
        }
        globalSearchBtn?.addEventListener('click', handleSearch);
        globalSearchInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSearch(); });
        document.getElementById('closeSearchModal')?.addEventListener('click', UI.closeSearchModal);

        // --- SLIDER (Carrusel) ---
        document.getElementById('prevSlide')?.addEventListener('click', () => {
            UI.prevSlide();
        });

        document.getElementById('nextSlide')?.addEventListener('click', () => {
            UI.nextSlide();
        });

        // --- Modal de producto - Navegación de imágenes ---
        document.getElementById('modalPrevImg')?.addEventListener('click', () => {
            UI.prevProductImage();
        });

        document.getElementById('modalNextImg')?.addEventListener('click', () => {
            UI.nextProductImage();
        });

        document.getElementById('modalAddToCartBtn')?.addEventListener('click', () => {
            const modal = document.getElementById('productModal');
            const productId = parseInt(modal.dataset.productId);
            if (productId) {
                const product = Business.getProductById(productId);
                if (product && !product.isSoldOut) {
                    Business.addToCart(product);
                    UI.closeProductModal();
                }
            }
        });
        document.getElementById('modalBuyNowBtn')?.addEventListener('click', () => {
            const modal = document.getElementById('productModal');
            const productId = parseInt(modal.dataset.productId);
            if (productId) {
                const product = Business.getProductById(productId);
                if (product) {
                    const text = `¡Hola EL BUNKER! Quiero comprar el siguiente producto:\n\n• ${product.title} - S/ ${product.priceNumber.toFixed(2)}\n\nGracias.`;
                    window.open(`https://wa.me/51923386655?text=${encodeURIComponent(text)}`, '_blank');
                    UI.closeProductModal();
                }
            }
        });
        document.getElementById('closeProductModal')?.addEventListener('click', UI.closeProductModal);

        // ============================================================
        //  ADMIN: LOGIN / LOGOUT
        // ============================================================
        const loginModal = document.getElementById('loginModal');
        document.getElementById('loginAdminBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (userMenuContainer) userMenuContainer.classList.remove('active');
            loginModal.classList.add('active');
        });
        document.getElementById('logoutAdminBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (userMenuContainer) userMenuContainer.classList.remove('active');
            esAdmin = false;
            Business.saveAdminSession(false);
            actualizarVisibilidadAdmin();
            UI.showToast('Sesión de administrador cerrada.', 'info');
        });
        document.getElementById('closeLoginModal')?.addEventListener('click', () => loginModal.classList.remove('active'));
        document.getElementById('btnCancelLogin')?.addEventListener('click', () => loginModal.classList.remove('active'));

        document.getElementById('loginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = document.getElementById('loginUser').value;
            const pass = document.getElementById('loginPass').value;
            if (user === Config.ADMIN_USERNAME && pass === Config.ADMIN_PASSWORD) {
                esAdmin = true;
                Business.saveAdminSession(true);
                actualizarVisibilidadAdmin();
                loginModal.classList.remove('active');
                UI.showToast('Bienvenido, administrador.', 'success');
            } else {
                UI.showToast('Usuario o contraseña incorrectos.', 'error');
            }
        });

        // ============================================================
        //  ADMIN: CONFIGURACIONES (solo en index)
        // ============================================================
        const isIndex = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname === '';

        if (isIndex) {
            UI.renderCarousel(carouselConfig);
            UI.renderCategories(categoryConfig);

            let currentTab = 0;
            function renderFeatured() {
                const tabTitles = [headerConfig.m1, headerConfig.m2, headerConfig.m3, headerConfig.m4];
                for (let i = 0; i < 4; i++) {
                    const tabEl = document.getElementById(`featTab${i}`);
                    if (tabEl) tabEl.innerText = tabTitles[i];
                }
                const cat = CATEGORIAS[currentTab];
                Business.getProducts().then(allProducts => {
                    const productos = allProducts.filter(p => p.categoria === cat)
                                 .sort((a,b) => (a.displayOrder||0) - (b.displayOrder||0));
                    UI.renderFeatured(productos, currentTab);
                });
            }
            document.querySelectorAll('.tab-item').forEach(tab => {
                tab.addEventListener('click', (e) => {
                    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
                    e.target.classList.add('active');
                    currentTab = parseInt(e.target.dataset.index);
                    renderFeatured();
                });
            });
            renderFeatured();

            // --- Header Setting ---
            const headerModal = document.getElementById('headerSettingModal');
            document.getElementById('openHeaderSettingModalBtn')?.addEventListener('click', (e) => {
                e.preventDefault();
                if (!esAdmin) { UI.showToast('No tienes permisos.', 'error'); return; }
                if (userMenuContainer) userMenuContainer.classList.remove('active');
                document.getElementById('headerTickerInput').value = headerConfig.tickerText;
                document.getElementById('menuName1').value = headerConfig.m1;
                document.getElementById('menuName2').value = headerConfig.m2;
                document.getElementById('menuName3').value = headerConfig.m3;
                document.getElementById('menuName4').value = headerConfig.m4;
                headerModal.classList.add('active');
            });
            document.getElementById('closeHeaderSettingModal')?.addEventListener('click', () => headerModal.classList.remove('active'));
            document.getElementById('btnCancelHeaderSetting')?.addEventListener('click', () => headerModal.classList.remove('active'));

            document.getElementById('headerSettingForm')?.addEventListener('submit', (e) => {
                e.preventDefault();
                if (!esAdmin) { UI.showToast('No tienes permisos.', 'error'); return; }
                headerConfig.tickerText = document.getElementById('headerTickerInput').value.trim();
                headerConfig.m1 = document.getElementById('menuName1').value.trim();
                headerConfig.m2 = document.getElementById('menuName2').value.trim();
                headerConfig.m3 = document.getElementById('menuName3').value.trim();
                headerConfig.m4 = document.getElementById('menuName4').value.trim();
                Business.saveHeaderConfig(headerConfig);
                applyHeaderConfigToUI();
                renderFeatured();
                headerModal.classList.remove('active');
                UI.showToast("Ajustes de cabecera guardados.", "success");
            });

            // --- Carousel Setting ---
            const carouselModal = document.getElementById('carouselSettingModal');
            document.getElementById('openCarouselSettingModalBtn')?.addEventListener('click', (e) => {
                e.preventDefault();
                if (!esAdmin) { UI.showToast('No tienes permisos.', 'error'); return; }
                if (userMenuContainer) userMenuContainer.classList.remove('active');
                document.getElementById('carouselCountSelect').value = carouselConfig.count;
                renderCarouselInputs();
                carouselModal.classList.add('active');
            });

            function renderCarouselInputs() {
                const count = parseInt(document.getElementById('carouselCountSelect').value);
                const container = document.getElementById('carouselTitlesContainer');
                container.innerHTML = '';
                for (let i = 0; i < count; i++) {
                    const titleVal = carouselConfig.slides[i] ? carouselConfig.slides[i].title : '';
                    const div = document.createElement('div');
                    div.className = 'form-group';
                    div.innerHTML = `<label>Título de la Imagen car${i + 1}.png (Opcional)</label><input type="text" id="carouselTitleInput_${i}" value="${titleVal}" placeholder="Dejar en blanco si no lleva título">`;
                    container.appendChild(div);
                }
            }

            document.getElementById('carouselCountSelect')?.addEventListener('change', renderCarouselInputs);
            document.getElementById('closeCarouselSettingModal')?.addEventListener('click', () => carouselModal.classList.remove('active'));
            document.getElementById('btnCancelCarouselSetting')?.addEventListener('click', () => carouselModal.classList.remove('active'));

            document.getElementById('carouselSettingForm')?.addEventListener('submit', (e) => {
                e.preventDefault();
                if (!esAdmin) { UI.showToast('No tienes permisos.', 'error'); return; }
                const count = parseInt(document.getElementById('carouselCountSelect').value);
                carouselConfig.count = count;
                for (let i = 0; i < count; i++) {
                    const val = document.getElementById(`carouselTitleInput_${i}`).value;
                    if (!carouselConfig.slides[i]) {
                        carouselConfig.slides[i] = { img: `car${i+1}.png`, title: val };
                    } else {
                        carouselConfig.slides[i].title = val;
                    }
                }
                Business.saveCarouselConfig(carouselConfig);
                UI.renderCarousel(carouselConfig);
                carouselModal.classList.remove('active');
                UI.showToast("Ajustes de carrusel guardados.", "success");
            });

            // --- Category Setting ---
            const categoryModal = document.getElementById('categorySettingModal');
            document.getElementById('openCategorySettingModalBtn')?.addEventListener('click', (e) => {
                e.preventDefault();
                if (!esAdmin) { UI.showToast('No tienes permisos.', 'error'); return; }
                if (userMenuContainer) userMenuContainer.classList.remove('active');
                for (let i = 1; i <= 4; i++) {
                    document.getElementById(`catTitleInput${i}`).value = categoryConfig.items[i-1].title;
                    document.getElementById(`catSubInput${i}`).value = categoryConfig.items[i-1].sub;
                }
                categoryModal.classList.add('active');
            });
            document.getElementById('closeCategorySettingModal')?.addEventListener('click', () => categoryModal.classList.remove('active'));
            document.getElementById('btnCancelCategorySetting')?.addEventListener('click', () => categoryModal.classList.remove('active'));

            document.getElementById('categorySettingForm')?.addEventListener('submit', (e) => {
                e.preventDefault();
                if (!esAdmin) { UI.showToast('No tienes permisos.', 'error'); return; }
                for (let i = 1; i <= 4; i++) {
                    categoryConfig.items[i-1].title = document.getElementById(`catTitleInput${i}`).value;
                    categoryConfig.items[i-1].sub = document.getElementById(`catSubInput${i}`).value;
                    categoryConfig.items[i-1].img = `cat${i}.jpg`;
                }
                Business.saveCategoryConfig(categoryConfig);
                UI.renderCategories(categoryConfig);
                categoryModal.classList.remove('active');
                UI.showToast("Ajustes de categorías guardados.", "success");
            });

        } else {
            // ============================================================
            //  PÁGINAS DE CATÁLOGO (pagA, pagB, pagC, pagD)
            // ============================================================
            const pathName = window.location.pathname.toLowerCase();
            if (pathName.includes('paga.html')) categoriaActual = Config.CATEGORIAS.VINILOS;
            else if (pathName.includes('pagb.html')) categoriaActual = Config.CATEGORIAS.CDS;
            else if (pathName.includes('pagc.html')) categoriaActual = Config.CATEGORIAS.EQUIPOS;
            else if (pathName.includes('pagd.html')) categoriaActual = Config.CATEGORIAS.ACCESORIOS;

            await renderCatalogPage();

            // ============================================================
            //  ADMIN: AGREGAR PRODUCTO
            // ============================================================
            const addProductModal = document.getElementById('addProductModal');
            const openAddProductModalBtn = document.getElementById('openAddProductModalBtn');
            let addExtraFiles = [];

            function resetAddProductForm() {
                const form = document.getElementById('addProductForm');
                if (form) form.reset();
                document.getElementById('addFormQuantity').value = '1';
                document.getElementById('addFormImage').value = '';
                document.getElementById('addImagePreviewContainer').style.display = 'none';
                document.getElementById('addExtraPreviews').innerHTML = '';
                addExtraFiles = [];
                document.getElementById('addExtraImagesInput').value = '';
            }

            openAddProductModalBtn?.addEventListener('click', (e) => {
                e.preventDefault();
                if (!esAdmin) { UI.showToast('No tienes permisos.', 'error'); return; }
                if (userMenuContainer) userMenuContainer.classList.remove('active');
                resetAddProductForm();
                addProductModal.classList.add('active');
            });
            document.getElementById('closeAddProductModal')?.addEventListener('click', () => { addProductModal.classList.remove('active'); resetAddProductForm(); });
            document.getElementById('btnCancelAddProduct')?.addEventListener('click', () => { addProductModal.classList.remove('active'); resetAddProductForm(); });

            // Previsualización de imágenes adicionales (agregar)
            const addExtraInput = document.getElementById('addExtraImagesInput');
            const addExtraContainer = document.getElementById('addExtraPreviews');
            addExtraInput?.addEventListener('change', function(e) {
                const files = Array.from(this.files);
                files.forEach(file => {
                    addExtraFiles.push(file);
                    const wrapper = document.createElement('div');
                    wrapper.className = 'extra-preview-item';
                    wrapper.style.position = 'relative';
                    wrapper.style.display = 'inline-block';
                    wrapper.style.margin = '5px';
                    const img = document.createElement('img');
                    img.className = 'extra-preview-img';
                    img.style.width = '80px';
                    img.style.height = '80px';
                    img.style.objectFit = 'cover';
                    img.style.borderRadius = '4px';
                    img.style.border = '1px solid #444';
                    const reader = new FileReader();
                    reader.onload = function(e) { img.src = e.target.result; };
                    reader.readAsDataURL(file);
                    const removeBtn = document.createElement('span');
                    removeBtn.className = 'remove-extra-btn';
                    removeBtn.textContent = '✕';
                    removeBtn.style.cssText = `
                        position: absolute;
                        top: -8px;
                        right: -8px;
                        background: #b71c1c;
                        color: #fff;
                        border-radius: 50%;
                        width: 22px;
                        height: 22px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 14px;
                        font-weight: bold;
                        cursor: pointer;
                        box-shadow: 0 0 4px rgba(0,0,0,0.5);
                        border: 1px solid #fff;
                        line-height: 1;
                    `;
                    removeBtn.addEventListener('click', function() {
                        const idx = addExtraFiles.indexOf(file);
                        if (idx > -1) addExtraFiles.splice(idx, 1);
                        wrapper.remove();
                    });
                    wrapper.appendChild(img);
                    wrapper.appendChild(removeBtn);
                    addExtraContainer.appendChild(wrapper);
                });
                this.value = '';
            });

            // -- EVENTO SUBMIT DEL FORMULARIO DE AGREGAR --
            document.getElementById('addProductForm')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (!esAdmin) { UI.showToast('No tienes permisos.', 'error'); return; }

                const mainFileInput = document.getElementById('addFormImageFile');
                let mainImageUrl = '';
                if (mainFileInput.files[0]) {
                    try {
                        mainImageUrl = await UI.processImageFile(mainFileInput.files[0]);
                    } catch (err) {
                        UI.showToast('Error al subir la imagen principal: ' + err.message, 'error');
                        return;
                    }
                } else {
                    mainImageUrl = Config.DEFAULT_PLACEHOLDER_IMAGE;
                }

                const extraUrls = [];
                for (const file of addExtraFiles) {
                    try {
                        const url = await UI.processImageFile(file);
                        extraUrls.push(url);
                    } catch (err) {
                        UI.showToast(`Error al subir imagen adicional: ${err.message}`, 'error');
                        return;
                    }
                }

                const allProducts = await Business.getProducts();
                const currentStarred = allProducts.filter(p => p.starred && p.categoria === categoriaActual).length;
                const newProduct = {
                    title: document.getElementById('addFormTitle').value,
                    priceNumber: parseFloat(document.getElementById('addFormPrice').value.replace(/[^0-9.]/g, '')) || 0,
                    quantity: parseInt(document.getElementById('addFormQuantity').value) || 0,
                    image: mainImageUrl,
                    isSoldOut: document.getElementById('addFormSoldOut').checked,
                    description: document.getElementById('addFormDescription').value,
                    starred: currentStarred < Config.MAX_STARRED_PER_CATEGORY,
                    categoria: categoriaActual,
                    imagesExtra: extraUrls
                };
                await Business.addProduct(newProduct);
                resetAddProductForm();
                addProductModal.classList.remove('active');
                await renderCatalogPage();
                UI.showToast("Producto guardado correctamente", "success");
            });

            // ============================================================
            //  ADMIN: INVENTARIO
            // ============================================================
            const inventoryModal = document.getElementById('inventoryModal');
            const openInventoryBtn = document.getElementById('openInventoryModalBtn');
            if (openInventoryBtn) {
                openInventoryBtn.replaceWith(openInventoryBtn.cloneNode(true));
                const newBtn = document.getElementById('openInventoryModalBtn');
                newBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!esAdmin) { UI.showToast('No tienes permisos.', 'error'); return; }
                    if (userMenuContainer) userMenuContainer.classList.remove('active');
                    await renderAdminList();
                    inventoryModal.classList.add('active');
                });
            }
            document.getElementById('closeInventoryModal')?.addEventListener('click', () => inventoryModal.classList.remove('active'));

            // ============================================================
            //  ADMIN: EDITAR PRODUCTO
            // ============================================================
            const editProductModal = document.getElementById('editProductModal');
            let editExtraFiles = [];

            window.openEditModal = async function(id) {
                if (!esAdmin) { UI.showToast('No tienes permisos.', 'error'); return; }
                const prod = Business.getProductById(id);
                if (!prod) return;
                inventoryModal.classList.remove('active');

                document.getElementById('editFormProductId').value = prod.id;
                document.getElementById('editFormTitle').value = prod.title;
                document.getElementById('editFormPrice').value = `S/ ${prod.priceNumber.toFixed(2)}`;
                document.getElementById('editFormQuantity').value = prod.quantity !== undefined ? prod.quantity : 1;
                document.getElementById('editFormImage').value = prod.image;
                document.getElementById('editFormSoldOut').checked = prod.isSoldOut;
                document.getElementById('editFormDescription').value = prod.description || '';

                const mainPreview = document.getElementById('editFormImagePreview');
                const mainContainer = document.getElementById('editImagePreviewContainer');
                if (mainPreview && mainContainer) {
                    mainPreview.src = prod.image;
                    mainContainer.style.display = 'block';
                }

                editExtraFiles = [];
                const extraContainer = document.getElementById('editExtraPreviews');
                extraContainer.innerHTML = '';
                const extraImages = prod.imagesExtra || [];
                extraImages.forEach((url, idx) => {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'extra-preview-item';
                    wrapper.style.position = 'relative';
                    wrapper.style.display = 'inline-block';
                    wrapper.style.margin = '5px';

                    const img = document.createElement('img');
                    img.src = url;
                    img.className = 'extra-preview-img';
                    img.style.width = '80px';
                    img.style.height = '80px';
                    img.style.objectFit = 'cover';
                    img.style.borderRadius = '4px';
                    img.style.border = '1px solid #444';

                    const removeBtn = document.createElement('span');
                    removeBtn.className = 'remove-extra-btn';
                    removeBtn.textContent = '✕';
                    removeBtn.style.cssText = `
                        position: absolute;
                        top: -8px;
                        right: -8px;
                        background: #b71c1c;
                        color: #fff;
                        border-radius: 50%;
                        width: 22px;
                        height: 22px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 14px;
                        font-weight: bold;
                        cursor: pointer;
                        box-shadow: 0 0 4px rgba(0,0,0,0.5);
                        border: 1px solid #fff;
                        line-height: 1;
                    `;
                    removeBtn.addEventListener('click', function() {
                        Business.deleteExtraImage(prod.id, url);
                        openEditModal(prod.id);
                    });

                    const btnUp = document.createElement('button');
                    btnUp.innerHTML = '▲';
                    btnUp.title = 'Mover arriba';
                    btnUp.style.cssText = 'background:#444; color:#fff; border:none; border-radius:3px; padding:2px 6px; cursor:pointer; font-size:12px; margin:2px;';
                    btnUp.addEventListener('click', (e) => {
                        e.stopPropagation();
                        Business.moveExtraImageUp(prod.id, idx);
                        openEditModal(prod.id);
                    });

                    const btnDown = document.createElement('button');
                    btnDown.innerHTML = '▼';
                    btnDown.title = 'Mover abajo';
                    btnDown.style.cssText = 'background:#444; color:#fff; border:none; border-radius:3px; padding:2px 6px; cursor:pointer; font-size:12px; margin:2px;';
                    btnDown.addEventListener('click', (e) => {
                        e.stopPropagation();
                        Business.moveExtraImageDown(prod.id, idx);
                        openEditModal(prod.id);
                    });

                    const btnSetMain = document.createElement('button');
                    btnSetMain.textContent = '★';
                    btnSetMain.title = 'Establecer como principal';
                    btnSetMain.style.cssText = 'background:var(--color-gold); color:#000; border:none; border-radius:3px; padding:2px 6px; cursor:pointer; font-size:12px; margin:2px; font-weight:bold;';
                    btnSetMain.addEventListener('click', (e) => {
                        e.stopPropagation();
                        Business.setProductMainImage(prod.id, url);
                        openEditModal(prod.id);
                    });

                    const btnGroup = document.createElement('div');
                    btnGroup.style.cssText = 'display:flex; gap:2px; margin-top:4px; justify-content:center;';
                    btnGroup.appendChild(btnUp);
                    btnGroup.appendChild(btnDown);
                    btnGroup.appendChild(btnSetMain);

                    wrapper.appendChild(img);
                    wrapper.appendChild(removeBtn);
                    wrapper.appendChild(btnGroup);
                    extraContainer.appendChild(wrapper);
                });

                document.getElementById('editExtraImagesInput').value = '';
                editProductModal.classList.add('active');
            };

            document.getElementById('closeEditProductModal')?.addEventListener('click', () => editProductModal.classList.remove('active'));
            document.getElementById('btnCancelEditProduct')?.addEventListener('click', () => editProductModal.classList.remove('active'));

            const editExtraInput2 = document.getElementById('editExtraImagesInput');
            const editExtraContainer2 = document.getElementById('editExtraPreviews');
            editExtraInput2?.addEventListener('change', function(e) {
                const files = Array.from(this.files);
                files.forEach(file => {
                    editExtraFiles.push(file);
                    const wrapper = document.createElement('div');
                    wrapper.className = 'extra-preview-item';
                    wrapper.style.position = 'relative';
                    wrapper.style.display = 'inline-block';
                    wrapper.style.margin = '5px';
                    const img = document.createElement('img');
                    img.className = 'extra-preview-img';
                    img.style.width = '80px';
                    img.style.height = '80px';
                    img.style.objectFit = 'cover';
                    img.style.borderRadius = '4px';
                    img.style.border = '1px solid #444';
                    const reader = new FileReader();
                    reader.onload = function(e) { img.src = e.target.result; };
                    reader.readAsDataURL(file);
                    const removeBtn = document.createElement('span');
                    removeBtn.className = 'remove-extra-btn';
                    removeBtn.textContent = '✕';
                    removeBtn.style.cssText = `
                        position: absolute;
                        top: -8px;
                        right: -8px;
                        background: #b71c1c;
                        color: #fff;
                        border-radius: 50%;
                        width: 22px;
                        height: 22px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 14px;
                        font-weight: bold;
                        cursor: pointer;
                        box-shadow: 0 0 4px rgba(0,0,0,0.5);
                        border: 1px solid #fff;
                        line-height: 1;
                    `;
                    removeBtn.addEventListener('click', function() {
                        const idx = editExtraFiles.indexOf(file);
                        if (idx > -1) editExtraFiles.splice(idx, 1);
                        wrapper.remove();
                    });
                    wrapper.appendChild(img);
                    wrapper.appendChild(removeBtn);
                    editExtraContainer2.appendChild(wrapper);
                });
                this.value = '';
            });

            document.getElementById('editProductForm')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (!esAdmin) { UI.showToast('No tienes permisos.', 'error'); return; }
                const idVal = parseInt(document.getElementById('editFormProductId').value);
                const prod = Business.getProductById(idVal);
                if (!prod) return;

                const updatedData = {
                    title: document.getElementById('editFormTitle').value,
                    priceNumber: parseFloat(document.getElementById('editFormPrice').value.replace(/[^0-9.]/g, '')) || 0,
                    quantity: parseInt(document.getElementById('editFormQuantity').value) || 0,
                    isSoldOut: document.getElementById('editFormSoldOut').checked,
                    description: document.getElementById('editFormDescription').value,
                };

                const mainFileInput = document.getElementById('editFormImageFile');
                if (mainFileInput && mainFileInput.files[0]) {
                    try {
                        updatedData.image = await UI.processImageFile(mainFileInput.files[0]);
                    } catch (err) {
                        UI.showToast('Error al subir la imagen principal: ' + err.message, 'error');
                        return;
                    }
                }

                const newExtraUrls = [];
                for (const file of editExtraFiles) {
                    try {
                        const url = await UI.processImageFile(file);
                        newExtraUrls.push(url);
                    } catch (err) {
                        UI.showToast(`Error al subir imagen adicional: ${err.message}`, 'error');
                        return;
                    }
                }
                const currentExtras = prod.imagesExtra || [];
                const total = currentExtras.length + newExtraUrls.length;
                if (total > 4) {
                    UI.showToast(`Solo se permiten hasta 4 imágenes adicionales. Actualmente tienes ${currentExtras.length} y estás agregando ${newExtraUrls.length}.`, 'error');
                    return;
                }
                updatedData.imagesExtra = [...currentExtras, ...newExtraUrls];

                await Business.updateProduct(idVal, updatedData);
                editProductModal.classList.remove('active');
                await renderCatalogPage();
                UI.showToast("Producto actualizado correctamente", "success");
            });
        }

        // ============================================================
        //  FUNCIÓN AUXILIAR: APLICAR CONFIGURACIÓN DE CABECERA
        // ============================================================
        function applyHeaderConfigToUI() {
            const config = headerConfig;
            const ticker1 = document.getElementById('tickerGroup1');
            const ticker2 = document.getElementById('tickerGroup2');
            if (ticker1 && ticker2) {
                const text = config.tickerText.trim();
                const htmlText = `<span>${text} &nbsp;&nbsp;&bull;&nbsp;&nbsp;</span><span>${text} &nbsp;&nbsp;&bull;&nbsp;&nbsp;</span><span>${text} &nbsp;&nbsp;&bull;&nbsp;&nbsp;</span>`;
                ticker1.innerHTML = htmlText;
                ticker2.innerHTML = htmlText;
            }

            const navMap = {
                navVinilos: config.m1,
                navCDs: config.m2,
                navEquipos: config.m3,
                navAccesorios: config.m4
            };
            for (const [id, text] of Object.entries(navMap)) {
                const el = document.getElementById(id);
                if (el) {
                    const icon = el.querySelector('i');
                    if (icon) {
                        el.innerHTML = '';
                        el.appendChild(icon);
                        el.appendChild(document.createTextNode(' ' + text));
                    } else {
                        el.textContent = text;
                    }
                }
            }

            const bannerTitle = document.getElementById('categoryBannerTitle');
            if (bannerTitle) {
                const path = window.location.pathname.toLowerCase();
                let key = '';
                if (path.includes('paga.html')) key = 'm1';
                else if (path.includes('pagb.html')) key = 'm2';
                else if (path.includes('pagc.html')) key = 'm3';
                else if (path.includes('pagd.html')) key = 'm4';
                if (key && config[key]) {
                    bannerTitle.textContent = config[key];
                }
            }
        }

        // ============================================================
        //  INICIALIZACIÓN FINAL
        // ============================================================
        applyHeaderConfigToUI();
        UI.updateCartUI();
        actualizarVisibilidadAdmin();

        // Ocultar spinner y mostrar contenido
        if (spinner) {
            spinner.style.display = 'none';
            spinner.classList.remove('active');
        }
        document.body.classList.remove('loading');

    } catch (error) {
        console.error('Error durante la inicialización:', error);
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.style.display = 'none';
            spinner.classList.remove('active');
        }
        document.body.classList.remove('loading');
        UI.showToast('Error al cargar los datos. Intenta recargar la página.', 'error');
    }
});