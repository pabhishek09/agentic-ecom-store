import Prisma from '../../lib/prisma.js'

const findAllProducts = async () => {
    return Prisma.product.findMany({take: 10});
}

const findProductById = async (id: number) => {
    return Prisma.product.findUnique({
        where: { id },
    });
}

const searchProducts = async (query: string) => {
    return Prisma.product.findMany({
        where: {
            name: {
                contains: query,
            },
        },
        take: 10,
    });
}

export { 
    findAllProducts,
    findProductById,
    searchProducts
 };
