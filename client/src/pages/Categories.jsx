import ResourcePage from '../components/ResourcePage.jsx';
import { useLang } from '../context/LanguageContext.jsx';

export default function Categories() {
  const { t } = useLang();
  return (
    <ResourcePage
      title={t('nav.categories')}
      singular={t('categories.singular')}
      subtitle={t('categories.subtitle')}
      endpoint="/categories"
      resource="categories"
      emptyItem={{ name: '', description: '' }}
      fields={[
        { name: 'name', label: t('common.name'), required: true, full: true },
        { name: 'description', label: t('common.description'), type: 'textarea', full: true },
      ]}
      columns={[
        { key: 'name', label: t('common.name') },
        { key: 'description', label: t('common.description') },
      ]}
    />
  );
}
