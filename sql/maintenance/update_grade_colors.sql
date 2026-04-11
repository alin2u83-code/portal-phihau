-- Adaugă coloana cod_culoare_hex dacă nu există
ALTER TABLE public.grade ADD COLUMN IF NOT EXISTS cod_culoare_hex TEXT DEFAULT '#E0E0E0';

-- Actualizează culorile pentru toate gradele conform ierarhiei specificate
UPDATE public.grade 
SET cod_culoare_hex = CASE
    -- 6-7 Dang (și superioare) - Fundal Alb (#FFFFFF)
    WHEN lower(nume) LIKE '%6 dang%' OR lower(nume) LIKE '%7 dang%' OR lower(nume) LIKE '%8 dang%' THEN '#FFFFFF'

    -- 1-5 Dang - Fundal Negru (#000000)
    WHEN lower(nume) LIKE '%dang%' THEN '#000000'
    
    -- Centura Neagră (fără Dang specificat) - Fundal Negru (#000000)
    WHEN lower(nume) LIKE '%neagra%' THEN '#000000'
    
    -- Centuri Albastre (Grad Albastru) - #FFFFFF
    -- IMPORTANT: Verificăm 'albastru' ÎNAINTE de 'cap alb' pentru a evita suprapunerea (ex: 'cap albastru')
    WHEN lower(nume) LIKE '%albastru%' OR lower(nume) LIKE '%debutant%' THEN '#FFFFFF'

    -- Centuri Roșii (Grad Roșu) - #FF0000
    WHEN lower(nume) LIKE '%rosu%' THEN '#FF0000'
    
    -- Centuri Galbene (Cap Galben) - #FFFF00
    WHEN lower(nume) LIKE '%galben%' THEN '#FFFF00'
    
    -- Centuri Violet (Cap Alb / Violet) - #8B00FF
    WHEN lower(nume) LIKE '%violet%' OR lower(nume) LIKE '%cap alb%' OR lower(nume) LIKE '%c.v.%' THEN '#8B00FF'
    
    ELSE '#E0E0E0' -- Fallback
END;
