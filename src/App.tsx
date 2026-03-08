// =============================================
// Slotify — главный файл приложения
// Маршрутизация между страницами
// =============================================

import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ServicesPage from "./pages/ServicesPage";
import { MasterPage, DateTimePage, ConfirmPage } from "./pages/BookingFlow";
import SuccessPage from "./pages/SuccessPage";
import MyBookingsPage from "./pages/MyBookingsPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/booking/master" element={<MasterPage />} />
        <Route path="/booking/datetime" element={<DateTimePage />} />
        <Route path="/booking/confirm" element={<ConfirmPage />} />
        <Route path="/booking/success" element={<SuccessPage />} />
        <Route path="/my-bookings" element={<MyBookingsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
