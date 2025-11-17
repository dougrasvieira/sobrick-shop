import React from 'react';

const DownloadApk: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-r from-[#57da74] to-black pb-20" style={{ fontFamily: '"Outfit", sans-serif' }}>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-md">
          <div className="mb-8">
            <img src="/logotipo.png" alt="Logo SóBrick" className="h-24 w-auto mx-auto mb-4" style={{ filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))' }} />
            <h1 className="text-4xl font-black text-black mb-2" translate="no">
              <span className="text-[#57da74]" style={{ WebkitTextStroke: '1px black' }}>Só</span><span className="text-black">Brick</span>
            </h1>
            <p className="text-white text-lg font-light italic" style={{ fontFamily: '"Playfair Display", serif', textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)' }}>Um bom negócio</p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Baixe o App Mobile</h2>
            <p className="text-gray-700 mb-6 text-sm">
              Tenha acesso a todos os produtos e anúncios diretamente no seu celular. Baixe agora e faça ótimos negócios!
            </p>
            <a
              href="https://drive.google.com/file/d/10wSZCDIcj_RWTI-vtrqgsiNxtQWwr7xX/view?usp=drive_link"
              download="sobrick.apk"
              className="inline-flex items-center px-6 py-3 bg-white text-[#57da74] font-bold rounded-lg hover:bg-gray-100 transition-colors shadow-md"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Baixar APK
            </a>
          </div>

          <div className="mt-8 text-center">
            <p className="text-white text-sm">
              Para instalar, permita downloads de fontes desconhecidas nas configurações do seu dispositivo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadApk;