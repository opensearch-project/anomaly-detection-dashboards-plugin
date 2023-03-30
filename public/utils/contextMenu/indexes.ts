import { useState, useEffect } from 'react';

export const useIndex = (embeddable) => {
  const [index, setIndex] = useState<any[] | null>();

  useEffect(() => {
    const getIndex = async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 4000);
      });

      const newIndex = [
        { health: 'green', label: 'opensearch_dashboards_sample_data_logs', status: 'open' },
      ];

      setIndex(newIndex);
    };

    getIndex();
  }, [embeddable]);

  return index;
};
