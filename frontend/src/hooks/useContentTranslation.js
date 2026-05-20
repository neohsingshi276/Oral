import { useEffect, useState } from 'react';
import { translateContentValue } from '../services/contentTranslation';

export const useContentTranslation = (value, language, deps = []) => {
  const [translated, setTranslated] = useState(value);

  useEffect(() => {
    let alive = true;
    setTranslated(value);

    translateContentValue(value, language)
      .then(nextValue => {
        if (alive) setTranslated(nextValue);
      })
      .catch(err => {
        console.error('Content translation failed:', err);
        if (alive) setTranslated(value);
      });

    return () => {
      alive = false;
    };
  }, [language, ...deps]);

  return translated;
};

export default useContentTranslation;
