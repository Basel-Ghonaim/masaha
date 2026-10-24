import { useCopy } from '@shared/copy';
import { Button, Field, Input, SearchIcon } from '@shared/design-system';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { SITE_PATHS } from '../../navigation';

/** The hero's search: a named search box and «بحث», opening the Directory with what was typed. */
export function HomeSearch() {
  const words = useCopy().site.home.search;
  const navigate = useNavigate();
  const [text, setText] = useState('');

  return (
    <form
      role="search"
      className="flex w-full max-w-2xl flex-col gap-2 md:flex-row md:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        const q = text.trim();
        void navigate(SITE_PATHS.spaces + (q === '' ? '' : `?q=${encodeURIComponent(q)}`));
      }}
    >
      <Field label={<span className="sr-only">{words.label}</span>} className="flex-1">
        <Input
          type="search"
          maxLength={80}
          placeholder={words.placeholder}
          startIcon={<SearchIcon />}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
          }}
        />
      </Field>
      <Button type="submit">{words.submit}</Button>
    </form>
  );
}
