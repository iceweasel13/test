/**
 * Uygulamada kullanılan hata kodlarını ve açıklamalarını içerir.
 */
export const ERROR_CODES = {
  E001: "Güvenilir olmayan tıklama olayı tespit edildi.",
  E002: "Kullanıcı kimliği doğrulanıyor, tıklama reddedildi.",
  E003: "Geçerli kullanıcı yok veya auth hatası.",
  E004: "Çok hızlı tıklama engellendi.",
  E005: "Tıklama limiti aşıldı veya izin verilmedi.",
  E006: "Ses oynatma hatası.",
  E007: "Kullanıcı bilgisi yüklenemedi.",
  E008: "Senkronizasyon hatası.",
  E009: "Kullanıcı verisi bulunamadı.",
  E010: "Cüzdan bağlı değil.",
  E011: "Giriş yapılan cüzdan ile bağlı cüzdan adresi uyuşmuyor.",
  E012: "Geçersiz akıllı sözleşme (package) adresi.",
  E013: "İşlem hazırlama hatası.",
  E014: "İşlem imzalama veya yürütme hatası.",
  E015: "Zincir üzerinde işlem başarısız oldu.",
  E016: "Satın alma olayı (MintEvent) bulunamadı.",
  E017: "Olay verisi ayrıştırma hatası.",
  E018: "Backend satın alma güncelleme hatası.",
  E019: "İşlem sonucu beklenirken hata oluştu.",
  E020: "Referans sayısı çekilemedi.",
  E021: "Referans linki kopyalanamadı.",
} as const;
