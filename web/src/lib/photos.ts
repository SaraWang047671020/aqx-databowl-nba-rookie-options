/**
 * 網站使用的照片與授權資訊。放入 public/images/ 的每張照片都要在這裡登記，
 * 「關於」頁會自動列出出處（CC BY 等授權要求標註作者）。
 */
export interface PhotoCredit {
  file: string; // 例如 "hero.jpg"
  author: string;
  source: string; // 例如 "Unsplash"
  url: string; // 照片原始頁面
  license: string; // 例如 "Unsplash License"、"CC BY 2.0"
}

export const PHOTO_CREDITS: PhotoCredit[] = [
  {
    file: "hero.jpg",
    author: "Corleone Brown",
    source: "Pexels",
    url: "https://www.pexels.com/photo/huge-arena-with-crowd-of-people-4500123/",
    license: "Pexels License",
  },
  {
    file: "band.jpg",
    author: "Davide Aracri",
    source: "Unsplash",
    url: "https://unsplash.com/photos/a-basketball-going-through-the-hoop-in-a-basketball-court-YF9YeTmhy6o",
    license: "Unsplash License",
  },
];
