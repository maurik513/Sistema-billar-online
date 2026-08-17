import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const ConfigContext = createContext(null);

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState({
    name: 'Billar System',
    primary_color: '#00C853',
    secondary_color: '#1B1B1B',
    currency_symbol: '$',
    currency: 'USD',
    ticket_footer: 'Gracias por su visita',
    billing_mode: 'hour'
  });

  useEffect(() => {
    api.get('/config').then(res => {
      if (res.data) {
        setConfig(res.data);
        applyTheme(res.data);
      }
    }).catch(() => {});
  }, []);

  const applyTheme = (cfg) => {
    document.documentElement.style.setProperty('--color-primary', cfg.primary_color || '#00C853');
    document.documentElement.style.setProperty('--color-secondary', cfg.secondary_color || '#1B1B1B');
    document.title = cfg.name || 'Billar System';
  };

  const updateConfig = (newConfig) => {
    setConfig(newConfig);
    applyTheme(newConfig);
  };

  const formatCurrency = (amount) => {
    return `${config.currency_symbol}${parseFloat(amount || 0).toFixed(2)}`;
  };

  return (
    <ConfigContext.Provider value={{ config, updateConfig, formatCurrency }}>
      {children}
    </ConfigContext.Provider>
  );
}

export const useConfig = () => useContext(ConfigContext);
