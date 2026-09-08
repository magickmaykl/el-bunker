// ============================================================
//  UI - Renderizado y manipulación del DOM
//  CATEGORÍAS ESTANDARIZADAS: 'vinilos', 'cds', 'equipos', 'accesorios'
// ============================================================

const UI = (function() {

    let toastTimer = null;
    const CATEGORIAS = Config.CATEGORIAS_LISTA;
    let _currentProductImages = [];
    let _currentDisplayIndex = 0;
    let _carouselInterval = null;
    let _currentProductId = null;

    // ============================================================
    //  TOAST NOTIFICATIONS
    // ============================================================
    function showToast(message, type = 'success') {
        let toast = document.getElementById('toastNotification');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toastNotification';
            toast.className = 'toast-notification-overlay';
            document.body.appendChild(toast);
        }
        const isSuccess = type === 'success';
        const isError = type === 'error';
        const isInfo = type === 'info';
        let titleText = '¡Éxito!';
        let iconClass = 'fa-check-circle';
        if (isError) { titleText = 'Error'; iconClass = 'fa-exclamation-circle'; }
        else if (isInfo) { titleText = 'Aviso'; iconClass = 'fa-info-circle'; }

        toast.innerHTML = `
            <div class="toast-dialog" onclick="event.stopPropagation()">
                <div class="toast-header ${type}">
                    <div class="toast-header-title"><i class="fas ${iconClass}"></i> <span>${titleText}</span></div>
                    <button class="toast-close-x" onclick="UI.closeToast()">&times;</button>
                </div>
                <div class="toast-body">${message}</div>
                <div class="toast-footer"><button class="toast-btn-ok ${type}" onclick="UI.closeToast()">OK</button></div>
            </div>
        `;
        toast.onclick = UI.closeToast;
        toast.classList.add('active');
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(UI.closeToast, 3000);
    }

    function closeToast() {
        const toast = document.getElementById('toastNotification');
        if (toast) toast.classList.remove('active');
        if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
    }

    // ============================================================
    //  CARRITO UI - CORREGIDO
    // ============================================================
    function updateCartUI() {
        const cart = Business.getCart();
        const cartCountBadge = document.getElementById('cartCountBadge');
        const headerCartTotal = document.getElementById('headerCartTotal');
        const cartTableBody = document.getElementById('cartTableBody');
        const modalCartSubtotal = document.getElementById('modalCartSubtotal');
        const modalCartTotal = document.getElementById('modalCartTotal');

        let totalQty = 0;
        let subtotal = 0;

        if (cartTableBody) cartTableBody.innerHTML = '';

        cart.forEach((item, index) => {
            totalQty += item.quantity;
            const itemSubtotal = item.price * item.quantity;
            subtotal += itemSubtotal;

            if (cartTableBody) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><span class="cart-item-remove" onclick="Business.removeCartItem(${index})">&times;</span></td>
                    <td>
                        <div class="cart-item-info">
                            <img src="${item.image}" alt="${item.title}" loading="lazy">
                            <span class="cart-item-title">${item.title}</span>
                        </div>
                    </td>
                    <td class="cart-item-price">S/ ${item.price.toFixed(2)}</td>
                    <td>
                        <div class="quantity-control">
                            <button onclick="Business.changeCartQty(${index}, -1)">−</button>
                            <input type="text" value="${item.quantity}" readonly>
                            <button onclick="Business.changeCartQty(${index}, 1)">+</button>
                        </div>
                    </td>
                    <td class="cart-item-subtotal">S/ ${itemSubtotal.toFixed(2)}</td>
                `;
                cartTableBody.appendChild(tr);
            }
        });

        if (cartCountBadge) cartCountBadge.innerText = totalQty;
        if (headerCartTotal) headerCartTotal.innerText = `S/ ${subtotal.toFixed(2)}`;
        if (modalCartSubtotal) modalCartSubtotal.innerText = `S/ ${subtotal.toFixed(2)}`;

        const shippingOption = document.querySelector('input[name="shippingMethod"]:checked');
        const shippingCost = shippingOption ? parseFloat(shippingOption.value) : Config.SHIPPING_COST;
        const total = subtotal > 0 ? subtotal + shippingCost : 0;

        if (modalCartTotal) modalCartTotal.innerText = `S/ ${total.toFixed(2)}`;
    }

    // ============================================================
    //  CATÁLOGO
    // ============================================================
    function renderCatalog(productos, currentPage, itemsPerPage, esAdmin, categoriaActual) {
        const catalogGrid = document.getElementById('catalogGrid');
        const catalogPagination = document.getElementById('catalogPagination');
        if (!catalogGrid) return;

        catalogGrid.innerHTML = '';
        const totalPages = Math.ceil(productos.length / itemsPerPage);
        if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;

        const currentProducts = productos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

        currentProducts.forEach(item => {
            const card = document.createElement('div');
            card.className = 'catalog-card';
            const badgeHtml = item.isSoldOut ? `<span class="badge-soldout">AGOTADO</span>` : '';
            let buttonHtml = item.isSoldOut 
                ? `<button class="btn-read-more" onclick="window.openProductModal(${item.id})">LEER MÁS</button>` 
                : `<button class="btn-add-cart" data-product-id="${item.id}">AÑADIR AL CARRITO</button>`;

            card.innerHTML = `
                <div class="card-img-wrapper" onclick="window.openProductModal(${item.id})">
                    <img src="${item.image}" alt="${item.title}">
                    ${badgeHtml}
                </div>
                <h2 class="card-title" onclick="window.openProductModal(${item.id})">${item.title}</h2>
                <div class="card-price">S/ ${item.priceNumber.toFixed(2)}</div>
                ${buttonHtml}
            `;

            const addBtn = card.querySelector('.btn-add-cart');
            if (addBtn) {
                addBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const product = Business.getProductById(item.id);
                    if (product) Business.addToCart(product);
                });
            }

            catalogGrid.appendChild(card);
        });

        renderPaginationControls(totalPages, currentPage, (page) => {
            if (window._catalogPageChangeCallback) {
                window._catalogPageChangeCallback(page);
            }
        });
        if (catalogPagination) {
            catalogPagination.style.display = totalPages > 1 ? 'flex' : 'none';
        }
    }

    function renderPaginationControls(totalPages, currentPage, onPageChange) {
        const pagination = document.getElementById('catalogPagination');
        if (!pagination) return;
        pagination.innerHTML = '';
        if (totalPages <= 1) { pagination.style.display = 'none'; return; }
        pagination.style.display = 'flex';

        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('a');
            pageBtn.className = `page-num ${i === currentPage ? 'active' : ''}`;
            pageBtn.innerText = i;
            pageBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (onPageChange) onPageChange(i);
            });
            pagination.appendChild(pageBtn);
        }
    }

    // ============================================================
    //  PRODUCTOS DESTACADOS
    // ============================================================
    function renderFeatured(productos, tabIndex) {
        const productGrid = document.getElementById('productGrid');
        if (!productGrid) return;
        productGrid.innerHTML = '';

        const starredProds = productos.filter(p => p.starred).slice(0, Config.MAX_STARRED_PER_CATEGORY);

        starredProds.forEach(item => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <div class="product-img-wrapper" onclick="window.openProductModal(${item.id})">
                    <img src="${item.image}" alt="${item.title}">
                </div>
                <div class="product-title" onclick="window.openProductModal(${item.id})">${item.title}</div>
                <div class="product-price">S/ ${item.priceNumber.toFixed(2)}</div>
                <button class="btn-add-cart" data-product-id="${item.id}">AÑADIR AL CARRITO</button>
            `;
            const addBtn = card.querySelector('.btn-add-cart');
            addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const product = Business.getProductById(item.id);
                if (product) Business.addToCart(product);
            });
            productGrid.appendChild(card);
        });
    }

    // ============================================================
    //  ADMINISTRACIÓN (Feature Toggle)
    // ============================================================
    
    function renderAdminList(productos, categoriaActual, onEdit) {
        const container = document.getElementById('adminProductsList');
        if (!container) return;
        container.innerHTML = '';

        if (productos.length === 0) {
            container.innerHTML = `<p style="color:#aaa; text-align:center; padding:20px;">No hay productos en esta categoría.</p>`;
            return;
        }

        const totalItems = productos.length;

        productos.forEach((item, index) => {
            const row = document.createElement('div');
            row.className = 'admin-list-item';
            
            const isLast = (index === totalItems - 1);
            
            const moveUpDisabled = index === 0;
            const moveDownDisabled = index === productos.length - 1;
            const starIcon = item.starred ? '⭐' : '☆';
            const starLabel = item.starred ? 'Quitar destacado' : 'Destacar';

            const lastClass = isLast ? 'admin-list-item-last' : '';

            row.innerHTML = `
                <div class="admin-list-info">
                    <div class="admin-list-details">
                        <div class="admin-list-title">${item.title} <span class="admin-star-indicator">${starIcon}</span></div>
                        <div class="admin-list-meta">S/ ${item.priceNumber.toFixed(2)} · Stock: ${item.quantity || 0} ${item.isSoldOut ? '· AGOTADO' : ''}</div>
                    </div>
                </div>
                <div class="admin-list-actions ${lastClass}">
                    <button class="btn-move-up" data-id="${item.id}" data-categoria="${categoriaActual}" ${moveUpDisabled ? 'disabled' : ''} title="Mover arriba"><i class="fas fa-angle-up"></i></button>
                    <button class="btn-move-down" data-id="${item.id}" data-categoria="${categoriaActual}" ${moveDownDisabled ? 'disabled' : ''} title="Mover abajo"><i class="fas fa-angle-down"></i></button>
                    <div class="admin-actions-dropdown">
                        <button class="btn-actions-toggle" title="Acciones"><i class="fas fa-ellipsis-v"></i></button>
                        <div class="admin-actions-menu ${isLast ? 'menu-drop-up' : ''}">
                            <button class="btn-edit-item" data-id="${item.id}"><i class="fas fa-edit"></i> Editar</button>
                            <button class="btn-star-toggle" data-id="${item.id}"><i class="fas fa-star"></i> ${starLabel}</button>
                            <button class="btn-delete-item" data-id="${item.id}" data-categoria="${categoriaActual}"><i class="fas fa-trash"></i> Eliminar</button>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(row);

            const toggleBtn = row.querySelector('.btn-actions-toggle');
            const menu = row.querySelector('.admin-actions-menu');
            toggleBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                document.querySelectorAll('.admin-actions-menu.open').forEach(m => {
                    if (m !== menu) m.classList.remove('open');
                });
                menu.classList.toggle('open');
            });

            document.addEventListener('click', function() {
                menu.classList.remove('open');
            });

            const deleteBtn = row.querySelector('.btn-delete-item');
            deleteBtn.addEventListener('click', async function(e) {
                e.stopPropagation();
                const id = parseInt(this.dataset.id);
                const cat = this.dataset.categoria;
                await Business.deleteProduct(id);
                const updatedProducts = await Business.getProductsByCategory(cat);
                renderAdminList(updatedProducts, cat, onEdit);
                if (window._catalogPageChangeCallback) {
                    window._catalogPageChangeCallback(1);
                }
                UI.showToast('Producto eliminado.', 'info');
                menu.classList.remove('open');
            });

            const moveUpBtn = row.querySelector('.btn-move-up');
            moveUpBtn.addEventListener('click', async function(e) {
                e.stopPropagation();
                if (this.disabled) return;
                const id = parseInt(this.dataset.id);
                const cat = this.dataset.categoria;
                await Business.moveProductUp(id, cat);
                const updatedProducts = await Business.getProductsByCategory(cat);
                renderAdminList(updatedProducts, cat, onEdit);
                if (window._catalogPageChangeCallback) {
                    window._catalogPageChangeCallback(1);
                }
            });

            const moveDownBtn = row.querySelector('.btn-move-down');
            moveDownBtn.addEventListener('click', async function(e) {
                e.stopPropagation();
                if (this.disabled) return;
                const id = parseInt(this.dataset.id);
                const cat = this.dataset.categoria;
                await Business.moveProductDown(id, cat);
                const updatedProducts = await Business.getProductsByCategory(cat);
                renderAdminList(updatedProducts, cat, onEdit);
                if (window._catalogPageChangeCallback) {
                    window._catalogPageChangeCallback(1);
                }
            });

            const editBtn = row.querySelector('.btn-edit-item');
            editBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                const id = parseInt(this.dataset.id);
                if (typeof onEdit === 'function') {
                    onEdit(id);
                }
                menu.classList.remove('open');
            });

            const starToggleBtn = row.querySelector('.btn-star-toggle');
            starToggleBtn.addEventListener('click', async function(e) {
                e.stopPropagation();
                const id = parseInt(this.dataset.id);
                await Business.toggleStarProduct(id);
                const updatedProducts = await Business.getProductsByCategory(categoriaActual);
                renderAdminList(updatedProducts, categoriaActual, onEdit);
                if (window._catalogPageChangeCallback) {
                    window._catalogPageChangeCallback(1);
                }
                if (document.getElementById('productGrid')) {
                    renderFeaturedTabs();
                }
                menu.classList.remove('open');
            });
        });
    }

    // ============================================================
    //  PRODUCT MODAL
    // ============================================================

    function openProductModal(product) {
        if (!product) return;
        const modal = document.getElementById('productModal');
        if (!modal) return;

        _currentProductImages = [product.image, ...(product.imagesExtra || [])];
        _currentDisplayIndex = 0;
        _currentProductId = product.id;

        updateProductModalImage();

        document.getElementById('modalProductTitle').innerText = product.title;
        document.getElementById('modalProductPrice').innerText = `S/ ${product.priceNumber.toFixed(2)}`;
        document.getElementById('modalDescription').innerText = product.description || 'Sin especificaciones disponibles.';
        
        const categoriaMap = {
            'vinilos': 'Vinilos',
            'cds': 'CDs',
            'equipos': 'Equipos',
            'accesorios': 'Accesorios'
        };
        const catName = categoriaMap[product.categoria] || product.categoria;
        document.getElementById('modalBreadcrumbTitle').innerText = catName;

        const qty = parseInt(product.quantity) || 0;
        document.getElementById('modalStockText').innerText = (product.isSoldOut || qty <= 0) ? "Agotado temporalmente" : `${qty} disponibles`;

        const extraContainer = document.getElementById('modalExtraImages');
        if (extraContainer) {
            extraContainer.innerHTML = '';
            _currentProductImages.forEach((url, idx) => {
                const thumb = document.createElement('img');
                thumb.src = url;
                thumb.alt = `Imagen ${idx+1}`;
                thumb.className = 'extra-thumb';
                thumb.dataset.index = idx;
                thumb.addEventListener('click', () => {
                    _currentDisplayIndex = idx;
                    updateProductModalImage();
                });
                extraContainer.appendChild(thumb);
            });
            const firstThumb = extraContainer.querySelector('.extra-thumb');
            if (firstThumb) firstThumb.style.borderColor = 'var(--color-gold)';
        }

        modal.dataset.productId = product.id;
        modal.classList.add('active');
    }

    function updateProductModalImage() {
        const img = document.getElementById('modalProductImg');
        const indicator = document.getElementById('modalImageIndicator');
        if (!img || !indicator) return;
        const total = _currentProductImages.length;
        if (total === 0) return;
        if (_currentDisplayIndex < 0) _currentDisplayIndex = total - 1;
        if (_currentDisplayIndex >= total) _currentDisplayIndex = 0;
        img.src = _currentProductImages[_currentDisplayIndex];
        indicator.textContent = `${_currentDisplayIndex+1}/${total}`;

        const thumbs = document.querySelectorAll('.modal-extra-images .extra-thumb');
        thumbs.forEach((thumb, idx) => {
            thumb.style.borderColor = (idx === _currentDisplayIndex) ? 'var(--color-gold)' : 'transparent';
        });
    }

    function prevProductImage() {
        const total = _currentProductImages.length;
        if (total <= 1) return;
        _currentDisplayIndex = (_currentDisplayIndex - 1 + total) % total;
        updateProductModalImage();
    }

    function nextProductImage() {
        const total = _currentProductImages.length;
        if (total <= 1) return;
        _currentDisplayIndex = (_currentDisplayIndex + 1) % total;
        updateProductModalImage();
    }

    function closeProductModal() {
        const modal = document.getElementById('productModal');
        if (modal) modal.classList.remove('active');
    }

    // ============================================================
    //  CARRUSEL Y CATEGORÍAS
    // ============================================================
    function renderCarousel(carouselConfig) {
        const wrapper = document.getElementById('sliderWrapper');
        const dotsContainer = document.getElementById('sliderDots');
        if (!wrapper || !dotsContainer) return;

        wrapper.innerHTML = '';
        dotsContainer.innerHTML = '';

        const activeSlides = carouselConfig.slides.slice(0, carouselConfig.count);

        activeSlides.forEach((slide, idx) => {
            const slideDiv = document.createElement('div');
            slideDiv.className = `slide ${idx === 0 ? 'active' : ''}`;
            const titleHtml = (slide.title && slide.title.trim() !== "") 
                ? `<div class="slide-content"><h1>${slide.title}</h1></div>` 
                : ``;
            slideDiv.innerHTML = `
                <img src="assets/car${idx + 1}.png" alt="Carrusel ${idx + 1}" class="hero-png-img" onerror="this.onerror=null;this.src='${Config.DEFAULT_PLACEHOLDER_IMAGE}'">
                ${titleHtml}
            `;
            wrapper.appendChild(slideDiv);

            const dot = document.createElement('div');
            dot.className = `dot ${idx === 0 ? 'active' : ''}`;
            dot.dataset.index = idx;
            dot.addEventListener('click', () => {
                const slides = document.querySelectorAll('.hero-slider .slide');
                const dots = document.querySelectorAll('.slider-dots .dot');
                slides.forEach(s => s.classList.remove('active'));
                dots.forEach(d => d.classList.remove('active'));
                slides[idx].classList.add('active');
                dots[idx].classList.add('active');
                if (_carouselInterval) {
                    clearInterval(_carouselInterval);
                    startCarouselTimer();
                }
            });
            dotsContainer.appendChild(dot);
        });

        startCarouselTimer();
    }

    function prevSlide() {
        const slides = document.querySelectorAll('.hero-slider .slide');
        const dots = document.querySelectorAll('.slider-dots .dot');
        if (!slides.length) return;
        let current = 0;
        slides.forEach((s, i) => { if (s.classList.contains('active')) current = i; });
        const prev = (current - 1 + slides.length) % slides.length;
        slides.forEach(s => s.classList.remove('active'));
        dots.forEach(d => d.classList.remove('active'));
        slides[prev].classList.add('active');
        dots[prev].classList.add('active');
        if (_carouselInterval) {
            clearInterval(_carouselInterval);
            startCarouselTimer();
        }
    }

    function nextSlide() {
        const slides = document.querySelectorAll('.hero-slider .slide');
        const dots = document.querySelectorAll('.slider-dots .dot');
        if (!slides.length) return;
        let current = 0;
        slides.forEach((s, i) => { if (s.classList.contains('active')) current = i; });
        const next = (current + 1) % slides.length;
        slides.forEach(s => s.classList.remove('active'));
        dots.forEach(d => d.classList.remove('active'));
        slides[next].classList.add('active');
        dots[next].classList.add('active');
        if (_carouselInterval) {
            clearInterval(_carouselInterval);
            startCarouselTimer();
        }
    }

    function startCarouselTimer() {
        if (_carouselInterval) clearInterval(_carouselInterval);
        _carouselInterval = setInterval(() => {
            nextSlide();
        }, 4000);
    }

    function renderCategories(categoryConfig) {
        for (let i = 1; i <= 4; i++) {
            const item = categoryConfig.items[i - 1];
            const tEl = document.getElementById(`catTitle${i}`);
            const sEl = document.getElementById(`catSub${i}`);
            const iEl = document.getElementById(`catImg${i}`);
            if (tEl) tEl.innerHTML = item.title;
            if (sEl) sEl.innerText = item.sub;
            if (iEl) iEl.src = `assets/cat${i}.jpg`;
        }
    }

    // ============================================================
    //  BÚSQUEDA GLOBAL
    // ============================================================
    function showSearchResults(productos) {
        const grid = document.getElementById('searchResultsGrid');
        const modal = document.getElementById('searchModal');
        if (!grid || !modal) return;
        grid.innerHTML = '';
        if (productos.length === 0) {
            grid.innerHTML = `<p style="grid-column:1/-1; color:#aaa; text-align:center; padding:20px;">No se encontraron productos coincidentes.</p>`;
        } else {
            productos.forEach(prod => {
                const card = document.createElement('div');
                card.className = 'catalog-card';
                card.style.margin = '0';
                card.innerHTML = `
                    <div class="card-img-wrapper" onclick="window.openProductModal(${prod.id})">
                        <img src="${prod.image}" alt="${prod.title}">
                    </div>
                    <h2 class="card-title" onclick="window.openProductModal(${prod.id})">${prod.title}</h2>
                    <div class="card-price">S/ ${prod.priceNumber.toFixed(2)}</div>
                    <button class="btn-add-cart" data-product-id="${prod.id}">AÑADIR AL CARRITO</button>
                `;
                const addBtn = card.querySelector('.btn-add-cart');
                addBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const product = Business.getProductById(prod.id);
                    if (product) Business.addToCart(product);
                });
                grid.appendChild(card);
            });
        }
        modal.classList.add('active');
    }

    function closeSearchModal() {
        const modal = document.getElementById('searchModal');
        if (modal) modal.classList.remove('active');
    }

    // ============================================================
    //  PROCESAMIENTO DE IMÁGENES - SUBIDA DIRECTA A ImgBB
    //  Mejorado: ahora sube como blob (archivo) en lugar de base64
    //  Redimensiona a 500x500 con recorte cuadrado centrado
    // ============================================================
    function processImageFile(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                resolve('');
                return;
            }

            // Verificar que el archivo sea una imagen
            if (!file.type.startsWith('image/')) {
                reject(new Error('El archivo no es una imagen válida.'));
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    try {
                        // Crear canvas para redimensionar
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        
                        // Recorte cuadrado centrado
                        const size = Math.min(img.width, img.height);
                        const x = (img.width - size) / 2;
                        const y = (img.height - size) / 2;
                        
                        // Tamaño de salida: 500x500 (suficiente para tienda virtual)
                        const outputSize = 500;
                        canvas.width = outputSize;
                        canvas.height = outputSize;
                        
                        // Dibujar la imagen recortada y redimensionada
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                        ctx.drawImage(img, x, y, size, size, 0, 0, outputSize, outputSize);
                        
                        // Convertir canvas a Blob (archivo) con compresión 0.7
                        canvas.toBlob(function(blob) {
                            if (!blob) {
                                reject(new Error('Error al procesar la imagen.'));
                                return;
                            }
                            
                            // Verificar tamaño del blob - si es muy grande, comprimir más
                            if (blob.size > 200 * 1024) { // > 200KB
                                canvas.toBlob(function(compressedBlob) {
                                    if (!compressedBlob) {
                                        // Si falla la compresión, usar el blob original
                                        subirABlob(blob, file.name, resolve, reject);
                                    } else {
                                        subirABlob(compressedBlob, file.name, resolve, reject);
                                    }
                                }, 'image/webp', 0.5);
                            } else {
                                subirABlob(blob, file.name, resolve, reject);
                            }
                        }, 'image/webp', 0.7);
                        
                    } catch (err) {
                        reject(err);
                    }
                };
                img.onerror = function() {
                    reject(new Error('Error al cargar la imagen.'));
                };
                img.src = e.target.result;
            };
            reader.onerror = function() {
                reject(new Error('Error al leer el archivo.'));
            };
            reader.readAsDataURL(file);
        });
    }

    /**
     * Sube un blob a ImgBB usando FormData
     */
    function subirABlob(blob, originalFileName, resolve, reject) {
        const formData = new FormData();
        // Crear un archivo a partir del blob
        const fileExtension = originalFileName ? originalFileName.split('.').pop() : 'webp';
        const fileName = `image_${Date.now()}.${fileExtension}`;
        formData.append('image', blob, fileName);
        formData.append('key', Config.IMG_BB_API_KEY);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', Config.IMG_BB_UPLOAD_URL, true);
        xhr.timeout = 30000; // 30 segundos de timeout
        
        xhr.onload = function() {
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success && response.data && response.data.url) {
                        resolve(response.data.url);
                    } else {
                        reject(new Error('Error en la respuesta de ImgBB: ' + (response.error?.message || 'Error desconocido')));
                    }
                } catch (e) {
                    reject(new Error('Error al procesar la respuesta del servidor.'));
                }
            } else {
                reject(new Error('Error al subir la imagen (código: ' + xhr.status + ').'));
            }
        };
        
        xhr.onerror = function() {
            reject(new Error('Error de conexión al servidor de imágenes.'));
        };
        
        xhr.ontimeout = function() {
            reject(new Error('Tiempo de espera agotado al subir la imagen.'));
        };
        
        xhr.send(formData);
    }

    // ============================================================
    //  FUNCIÓN PARA RENDERIZAR TABS DESTACADOS
    // ============================================================
    async function renderFeaturedTabs() {
        const activeTab = document.querySelector('.tab-item.active');
        const tabIndex = activeTab ? parseInt(activeTab.dataset.index) : 0;
        const cat = CATEGORIAS[tabIndex];
        const allProducts = await Business.getProducts();
        const productos = allProducts.filter(p => p.categoria === cat)
                             .sort((a,b) => (a.displayOrder||0) - (b.displayOrder||0));
        renderFeatured(productos, tabIndex);
    }

    // ============================================================
    //  EXPOSICIÓN PÚBLICA
    // ============================================================
    return {
        showToast,
        closeToast,
        updateCartUI,
        renderCatalog,
        renderFeatured,
        renderAdminList,
        renderCarousel,
        renderCategories,
        openProductModal,
        closeProductModal,
        updateProductModalImage,
        prevProductImage,
        nextProductImage,
        prevSlide,
        nextSlide,
        showSearchResults,
        closeSearchModal,
        renderFeaturedTabs,
        processImageFile,
        _carouselInterval: _carouselInterval
    };
})();