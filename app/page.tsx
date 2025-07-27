import { redirect } from 'next/navigation';

export default function Page() {
  return (
    <div style={{ minHeight: '300vh' }}>
      {/* Redirect to the default locale with the basePath */}
      <redirect('/en') />
    </div>
  );
}