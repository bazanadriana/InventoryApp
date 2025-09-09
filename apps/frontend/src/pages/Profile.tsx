import SalesforceForm from '../components/profile/SalesforceForm';
// ... your existing imports

export default function Profile() {
  // load current user, etc.
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* your current profile UI */}

      <div className="border-t pt-6">
        <SalesforceForm onSuccess={(ids) => {
          console.log('SF IDs:', ids);
        }} />
      </div>
    </div>
  );
}
