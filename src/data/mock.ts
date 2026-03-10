// =============================================
// Моковые данные для Slotify (без бэкенда)
// =============================================

// --- Типы ---
export interface Service {
  id: number;
  name: string;
  category: string;
  duration: number; // минуты
  price: number;
  description: string;
  image: string; // фото-пример услуги
}

export interface Master {
  id: number;
  name: string;
  photo: string;
  specialization: string;
  rating: number;
  experience: string; // опыт работы
  portfolio: string[]; // фото примеров работ
}

export interface TimeSlot {
  time: string; // "10:00"
  available: boolean;
}

export interface Booking {
  id: number;
  service: Service;
  master: Master;
  date: string;
  time: string;
  clientName: string;
  clientPhone: string;
  status: "upcoming" | "past" | "cancelled";
}

