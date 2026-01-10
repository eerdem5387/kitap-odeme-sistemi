/*
  Warnings:

  - You are about to drop the `blog_categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `blog_post_tags` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `blog_posts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `blog_tags` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `contact_form_submissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `contact_forms` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `contents` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `menu_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `menus` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."blog_post_tags" DROP CONSTRAINT "blog_post_tags_postId_fkey";

-- DropForeignKey
ALTER TABLE "public"."blog_post_tags" DROP CONSTRAINT "blog_post_tags_tagId_fkey";

-- DropForeignKey
ALTER TABLE "public"."blog_posts" DROP CONSTRAINT "blog_posts_authorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."blog_posts" DROP CONSTRAINT "blog_posts_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."contact_form_submissions" DROP CONSTRAINT "contact_form_submissions_formId_fkey";

-- DropForeignKey
ALTER TABLE "public"."menu_items" DROP CONSTRAINT "menu_items_menuId_fkey";

-- DropForeignKey
ALTER TABLE "public"."menu_items" DROP CONSTRAINT "menu_items_parentId_fkey";

-- DropTable
DROP TABLE "public"."blog_categories";

-- DropTable
DROP TABLE "public"."blog_post_tags";

-- DropTable
DROP TABLE "public"."blog_posts";

-- DropTable
DROP TABLE "public"."blog_tags";

-- DropTable
DROP TABLE "public"."contact_form_submissions";

-- DropTable
DROP TABLE "public"."contact_forms";

-- DropTable
DROP TABLE "public"."contents";

-- DropTable
DROP TABLE "public"."menu_items";

-- DropTable
DROP TABLE "public"."menus";

-- DropEnum
DROP TYPE "public"."ContentStatus";

-- DropEnum
DROP TYPE "public"."ContentType";

-- CreateIndex
CREATE INDEX "products_isActive_categoryId_sortOrder_idx" ON "products"("isActive", "categoryId", "sortOrder");

-- CreateIndex
CREATE INDEX "products_isActive_sortOrder_createdAt_idx" ON "products"("isActive", "sortOrder", "createdAt");

-- CreateIndex
CREATE INDEX "products_categoryId_isActive_idx" ON "products"("categoryId", "isActive");
