/*
  Warnings:

  - You are about to drop the column `price` on the `Book` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `Book` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Book" DROP COLUMN "price",
DROP COLUMN "quantity";
