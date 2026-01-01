import React, { useState } from "react";
import { Check, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar.jsx";

const moulds = [
  {
    bgColor: "bg-blue-500/20",
    iconColor: "text-purple-400",
    textColor: "text-purple-200",
    contentColor: "text-purple-300",
    product: "Magnolia 160 jumper",
    number: "D1-409",
    icon: "X",
    image: "media/2_lamela.png",
    weight: "160",
    cavities: 2,
    status: "productive",
    place: "production",
    mostPopular: true,
    company: "Lamela",
    ramka: "border-blue-500",
    logo_color: "from-blue-500",
    logo_color2: "to-cyan-500 "
  },
  {
    bgColor: "bg-blue-500/20",
    iconColor: "text-purple-400",
    textColor: "text-purple-200",
    contentColor: "text-purple-300",
    product: "Spruttig NF",
    number: "I-24474-D",
    icon: "X",
    image: "media/1_lamela.png",
    weight: "160",
    cavities: 2,
    status: "productive",
    place: "production",
    mostPopular: false,
    company: "Ikea",
    ramka: "border-green-500",
    logo_color: "from-green-600",
    logo_color2: "to-green-400 "
  },
  {
    bgColor: "bg-blue-500/20",
    iconColor: "text-purple-400",
    textColor: "text-purple-200",
    contentColor: "text-purple-300",
    product: "Trofast średni 3",
    number: "I-24267-A",
    icon: "X",
    image: "media/2_lamela.png",
    weight: "160",
    cavities: 2,
    status: "productive",
    place: "production",
    mostPopular: false,
    company: "Ikea",
    ramka: "border-green-500",
    logo_color: "from-green-600",
    logo_color2: "to-green-400 "
  },
  {
    bgColor: "bg-blue-500/20",
    iconColor: "text-purple-400",
    textColor: "text-purple-200",
    contentColor: "text-purple-300",
    product: "Baggmuck",
    number: "I-24173-A",
    icon: "X",
    image: "media/1_lamela.png",
    weight: "160",
    cavities: 2,
    status: "productive",
    place: "production",
    mostPopular: false,
    company: "Ikea",
    ramka: "border-green-500",
    logo_color: "from-green-600",
    logo_color2: "to-green-400 "
  },
  {
    bgColor: "bg-blue-500/20",
    iconColor: "text-purple-400",
    textColor: "text-purple-200",
    contentColor: "text-purple-300",
    product: "Finezja 300x300 gładka",
    number: "D1-366-G",
    icon: "X",
    image: "media/2_lamela.png",
    weight: "160",
    cavities: 2,
    status: "productive",
    place: "production",
    mostPopular: false,
    company: "Lamela",
    ramka: "border-blue-500",
    logo_color: "from-blue-500",
    logo_color2: "to-cyan-500 "
  },
  {
    bgColor: "bg-blue-500/20",
    iconColor: "text-purple-400",
    textColor: "text-purple-200",
    contentColor: "text-purple-300",
    product: "Malwa 250",
    number: "D1-426",
    icon: "X",
    image: "media/1_lamela.png",
    weight: "160",
    cavities: 2,
    status: "productive",
    place: "production",
    mostPopular: false,
    company: "Lamela",
    ramka: "border-blue-500",
    logo_color: "from-blue-500",
    logo_color2: "to-cyan-500 "
  },
  {
    bgColor: "bg-blue-500/20",
    iconColor: "text-purple-400",
    textColor: "text-purple-200",
    contentColor: "text-purple-300",
    product: "Doniczka Agawa fi 550 dłuto - rozdmuch",
    number: "D1-410-D",
    icon: "X",
    image: "media/2_lamela.png",
    weight: "160",
    cavities: 2,
    status: "productive",
    place: "production",
    mostPopular: false,
    company: "Lamela",
    ramka: "border-blue-500",
    logo_color: "from-blue-500",
    logo_color2: "to-cyan-500 "
  }
];

export default function Pricing() {
  const pageSize = 6;
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");

  const navigate = useNavigate();

  const handleOpen = (mould) => {
    navigate(`/moulds/${mould.number}`, { state: { mould } });
  };

  // lista firm do przycisków
  const companies = ["all", ...new Set(moulds.map((m) => m.company))];

  // FILTROWANIE po product / number + company (case-insensitive)
  const filteredMoulds = moulds.filter((mould) => {
    const term = searchTerm.toLowerCase();

    const matchesSearch =
      !term ||
      mould.product.toLowerCase().includes(term) ||
      mould.number.toLowerCase().includes(term);

    const matchesCompany =
      companyFilter === "all" || mould.company === companyFilter;

    return matchesSearch && matchesCompany;
  });

  // PAGINACJA po przefiltrowanej liście
  const totalPages = Math.ceil(filteredMoulds.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const currentMoulds = filteredMoulds.slice(startIndex, startIndex + pageSize);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleCompanyChange = (value) => {
    setCompanyFilter(value);
    setCurrentPage(1);
  };

  return (
    <>
      <Navbar />
      <section
        id="pricing"
        className="py-16 sm:py-20 px-10 sm:px-6 lg:px-8 relative"
      >
        <div className="max-w-full mx-auto lg:mx-8">
          {/* HEADER */}
          <div className="text-center mb-8 sm:mb-10 lg:mb-12">
            <h2 className="text-5xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6">
              <span className="bg-gradient-to-b from-white to-gray-300 bg-clip-text text-transparent">
                Formy wtryskowe{" "}
              </span>
              <span className="bg-gradient-to-b from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                i rozdmuchowe
              </span>
            </h2>
            <p className="text-gray-400 text-base text-xl sm:text-lg max-w-2xl mx-auto">
              Dane firmy Lamela Sp. z o.o.
            </p>
          </div>

          {/* SEARCH + FILTER BAR */}
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* SEARCH */}
            <div className="w-full sm:w-96 relative">
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Szukaj po nazwie produktu lub numerze formy..."
                className="w-full px-4 py-2 rounded-xl bg-slate-900/60 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
              />
            </div>

            {/* FILTRY + LICZNIK */}
            <div className="flex flex-col sm:items-end gap-2">
              <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
                {companies.map((c) => (
                  <button
                    key={c}
                    onClick={() => handleCompanyChange(c)}
                    className={`px-3 py-1 rounded-full text-xs sm:text-sm border transition ${
                      companyFilter === c
                        ? "bg-blue-500 border-blue-500 text-white"
                        : "border-slate-700 text-gray-300 hover:border-slate-500"
                    }`}
                  >
                    {c === "all" ? "Wszystkie" : c}
                  </button>
                ))}
              </div>
              <div className="text-sm text-gray-400">
                Widoczne:{" "}
                <span className="font-semibold text-blue-400">
                  {filteredMoulds.length}
                </span>{" "}
                form
              </div>
            </div>
          </div>

          {/* GRID */}
          {currentMoulds.length === 0 ? (
            <div className="text-center text-gray-400 py-16">
              Brak wyników dla:{" "}
              <span className="font-semibold text-blue-400">
                {searchTerm || "(pusty filtr)"}
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-6">
              {currentMoulds.map((mould) => (
                <div
                  key={mould.number}
                  className={`relative bg-slate-800/50 backdrop-blur-sm border rounded-xl sm:rounded-2xl p-6 sm:p-8 hover:scale-105 transition-all duration-300 overflow-visible group flex flex-col h-full ${mould.ramka} shadow-2xl shadow-blue-500/20`}
                >
                  <div className="absolute -top-2 sm:-top-3 left-1/2 transform -translate-x-1/2 z-10">
                    <div
                      className={`flex items-center space-x-1 px-4 py-1 bg-gradient-to-b ${mould.logo_color} ${mould.logo_color2} rounded-full text-sm font-semibold shadow-lg`}
                    >
                      <span>{mould.company}</span>
                    </div>
                  </div>

                  <div className="text-center mb-6 sm:mb-8">
                    <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                      {mould.number}
                    </h3>
                    <p className="text-xl sm:text-2xl font-bold mb-2">
                      {mould.product}
                    </p>
                    <div className="flex items-baseline justify-center">
                      <img src={mould.image} className="rounded-3xl" />
                    </div>
                  </div>

                  <div className="p-2">
                    <table className="w-full text-left table-auto min-w-max">
                      <tbody>
                        <tr>
                          <th className="pr-2">Waga:</th>
                          <td className="pr-4">{mould.weight}</td>
                          <th className="pr-2">Status:</th>
                          <td>{mould.status}</td>
                        </tr>
                        <tr>
                          <th className="pr-2">Il. gniazd:</th>
                          <td className="pr-4">{mould.cavities}</td>
                          <th className="pr-2">Miejsce:</th>
                          <td>{mould.place}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <button
                    onClick={() => handleOpen(mould)}
                    className="w-full py-3 rounded-lg font-semibold bg-gradient-to-b from-blue-500 to-cyan-500 mt-auto hover:scale-105"
                  >
                    Get Started
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* PAGINATION */}
          {filteredMoulds.length > 0 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <button
                onClick={() => goToPage(safePage - 1)}
                disabled={safePage === 1}
                className="px-3 py-2 border border-slate-700 rounded-lg disabled:opacity-40 hover:border-slate-500"
              >
                ◀
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={`px-3 py-2 rounded-lg border ${
                      safePage === page
                        ? "bg-blue-500 border-blue-500 text-white"
                        : "border-slate-700 hover:border-slate-500"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}

              <button
                onClick={() => goToPage(safePage + 1)}
                disabled={safePage === totalPages}
                className="px-3 py-2 border border-slate-700 rounded-lg disabled:opacity-40 hover:border-slate-500"
              >
                ▶
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
