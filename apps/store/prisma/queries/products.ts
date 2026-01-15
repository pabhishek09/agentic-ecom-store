import Prisma from '../../lib/prisma.js'

const findAllProducts = async () => {
    return Prisma.product.findMany({take: 10});
}


export { findAllProducts };
