import PageLayout from '../components/layout/PageLayout';

export default function Dashboard() {
  return (
    <PageLayout showDateRange={true}>
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-white mb-2">
            Dashboard
          </h2>
          <p className="text-pn-text-secondary">
            Page content removed - ready for new implementation.
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
