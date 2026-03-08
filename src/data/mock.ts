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

// --- Услуги (с тематическими картинками Unsplash) ---
// Формат URL: https://images.unsplash.com/photo-{ID}?w=400&h=300&fit=crop
export const services: Service[] = [
  { id: 1, name: "Женская стрижка", category: "Стрижки", duration: 60, price: 2500, description: "Стрижка любой сложности с мытьём и укладкой", image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop" },
  { id: 2, name: "Мужская стрижка", category: "Стрижки", duration: 40, price: 1500, description: "Классическая или модельная стрижка", image: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&h=300&fit=crop" },
  { id: 3, name: "Окрашивание", category: "Стрижки", duration: 120, price: 5000, description: "Однотонное окрашивание профессиональной краской", image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=300&fit=crop" },
  { id: 4, name: "Маникюр классический", category: "Маникюр", duration: 60, price: 1800, description: "Классический маникюр с покрытием гель-лаком", image: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=300&fit=crop" },
  { id: 5, name: "Маникюр с дизайном", category: "Маникюр", duration: 90, price: 2800, description: "Маникюр с художественным дизайном ногтей", image: "https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=400&h=300&fit=crop" },
  { id: 6, name: "Педикюр", category: "Маникюр", duration: 75, price: 2200, description: "Аппаратный педикюр с покрытием", image: "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=400&h=300&fit=crop" },
  { id: 7, name: "Чистка лица", category: "Косметология", duration: 90, price: 3500, description: "Ультразвуковая чистка лица", image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&h=300&fit=crop" },
  { id: 8, name: "Пилинг", category: "Косметология", duration: 60, price: 3000, description: "Химический пилинг для обновления кожи", image: "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=400&h=300&fit=crop" },
  { id: 9, name: "Наращивание ресниц", category: "Ресницы и брови", duration: 120, price: 4000, description: "Поресничное наращивание, эффект 2D", image: "https://images.unsplash.com/photo-1633465631144-aa321b66d44a?w=400&h=300&fit=crop" },
  { id: 10, name: "Коррекция бровей", category: "Ресницы и брови", duration: 30, price: 1000, description: "Коррекция формы и окрашивание бровей", image: "https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=400&h=300&fit=crop" },
];

// --- Мастера (с портфолио) ---
export const masters: Master[] = [
  {
    id: 1,
    name: "Анна Иванова",
    photo: "https://i.pravatar.cc/150?img=1",
    specialization: "Стилист-колорист",
    rating: 4.9,
    experience: "8 лет опыта",
    portfolio: [
      "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&h=300&fit=crop",
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=300&h=300&fit=crop",
      "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=300&h=300&fit=crop",
    ],
  },
  {
    id: 2,
    name: "Мария Петрова",
    photo: "https://i.pravatar.cc/150?img=5",
    specialization: "Мастер маникюра",
    rating: 4.8,
    experience: "5 лет опыта",
    portfolio: [
      "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=300&h=300&fit=crop",
      "https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=300&h=300&fit=crop",
      "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=300&h=300&fit=crop",
    ],
  },
  {
    id: 3,
    name: "Елена Сидорова",
    photo: "https://i.pravatar.cc/150?img=9",
    specialization: "Косметолог",
    rating: 4.7,
    experience: "6 лет опыта",
    portfolio: [
      "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=300&h=300&fit=crop",
      "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=300&h=300&fit=crop",
      "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=300&h=300&fit=crop",
    ],
  },
  {
    id: 4,
    name: "Ольга Козлова",
    photo: "https://i.pravatar.cc/150?img=16",
    specialization: "Бровист-лешмейкер",
    rating: 4.9,
    experience: "4 года опыта",
    portfolio: [
      "https://images.unsplash.com/photo-1633465631144-aa321b66d44a?w=300&h=300&fit=crop",
      "https://images.unsplash.com/photo-1652201767864-49472c48b145?w=300&h=300&fit=crop",
      "https://images.unsplash.com/photo-1553103326-609d1bd0ca03?w=300&h=300&fit=crop",
    ],
  },
];

// --- Слоты времени (генерация для выбранного дня) ---
export function generateTimeSlots(): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let hour = 9; hour <= 19; hour++) {
    slots.push({ time: `${hour}:00`, available: Math.random() > 0.3 });
    if (hour < 19) {
      slots.push({ time: `${hour}:30`, available: Math.random() > 0.4 });
    }
  }
  return slots;
}

// --- Существующие записи пользователя ---
export const myBookings: Booking[] = [
  {
    id: 1,
    service: services[0],
    master: masters[0],
    date: "2026-03-12",
    time: "14:00",
    clientName: "Клиент",
    clientPhone: "+7 999 123-45-67",
    status: "upcoming",
  },
  {
    id: 2,
    service: services[3],
    master: masters[1],
    date: "2026-02-20",
    time: "11:00",
    clientName: "Клиент",
    clientPhone: "+7 999 123-45-67",
    status: "past",
  },
];
