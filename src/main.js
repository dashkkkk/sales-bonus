/**
 * Функция для расчета прибыли
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */


/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const { discount = 0, sale_price, quantity } = purchase;
    const discountFactor = discount / 100;
    const totalPrice = sale_price * quantity;
    return totalPrice * (1 - discountFactor);
}

function calculateBonusByProfit(index, total, seller) {
    if (index === 0) return seller.profit * 0.15;
    if (index === 1 || index === 2) return seller.profit * 0.1;
    if (index === total - 1) return seller.profit * 0;
    return seller.profit * 0.05;
}

function analyzeSalesData(data, options = {}) {
    
    if (!data || !Array.isArray(data.sellers) || 
        !Array.isArray(data.purchase_records) || 
        !Array.isArray(data.products) ||
        data.sellers.length === 0 || 
        data.products.length === 0 || 
        data.purchase_records.length === 0) {
        throw new Error('Некорректные входные данные');
    }
    
    
    if (options && (typeof options !== 'object' || Array.isArray(options))) {
        throw new Error('Некорректные входные данные');
    }

    const calculateRevenue = options?.calculateRevenue || calculateSimpleRevenue;
    const calculateBonus = options?.calculateBonus || calculateBonusByProfit;

    if (typeof calculateRevenue !== 'function') {
        throw new Error('calculateRevenue должна быть функцией');
    }
    if (typeof calculateBonus !== 'function') {
        throw new Error('calculateBonus должна быть функцией');
    }

    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    const sellerIndex = sellerStats.reduce((acc, seller) => {
        acc[seller.id] = seller;
        return acc;
    }, {});

    const productIndex = data.products.reduce((acc, product) => {
        if (acc[product.sku]) {
            console.warn(`Обнаружен дубликат SKU: ${product.sku}`);
        }
        acc[product.sku] = product;
        return acc;
    }, {});

    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        if (!seller) return;
        
        seller.sales_count++;
        
        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) return;
            
            const revenue = calculateRevenue(item, product);
            const cost = product.purchase_price * item.quantity;
            const profit = revenue - cost;
            
            seller.revenue += revenue;
            seller.profit += profit;
            
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });

    sellerStats.sort((a, b) => b.profit - a.profit);

    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller);
        
        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({
                sku,
                quantity
            }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });

    return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: parseFloat(seller.revenue.toFixed(2)),
        profit: parseFloat(seller.profit.toFixed(2)),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: parseFloat(seller.bonus.toFixed(2)),
    }));
}