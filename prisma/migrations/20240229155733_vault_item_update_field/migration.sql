ALTER TABLE "VaultItem" DROP COLUMN "detailsSizeKB",
DROP COLUMN "imagesSizeKB",
DROP COLUMN "modelSizeKB",
ADD COLUMN     "detailsSizeKb" INTEGER NOT NULL,
ADD COLUMN     "imagesSizeKb" INTEGER NOT NULL,
ADD COLUMN     "modelSizeKb" INTEGER NOT NULL;