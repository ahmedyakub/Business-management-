import ResourcePage from '../components/ResourcePage.jsx';

export default function Categories() {
  return (
    <ResourcePage
      title="Categories"
      subtitle="Group products for easier browsing and reporting"
      endpoint="/categories"
      resource="categories"
      emptyItem={{ name: '', description: '' }}
      fields={[
        { name: 'name', label: 'Name', required: true, full: true },
        { name: 'description', label: 'Description', type: 'textarea', full: true },
      ]}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'description', label: 'Description' },
      ]}
    />
  );
}
