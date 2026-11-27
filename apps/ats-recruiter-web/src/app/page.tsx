import { redirect } from 'next/navigation';

export default function RecruiterRootRedirect() {
  redirect('/recruiter/today');
}
