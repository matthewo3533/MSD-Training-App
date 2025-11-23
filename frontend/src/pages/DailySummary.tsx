import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Editor } from '@hugerte/hugerte-react';
import api from '../services/api';
import Layout from '../components/Layout';
import { formatDate } from '../utils/date';
import { formatUserName } from '../utils/nameFormatter';

const DailySummary = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      const response = await api.get(`/sessions/${id}`);
      const sessionData = response.data;
      setSession(sessionData);

      if (sessionData.dailySummary) {
        setSummary(sessionData.dailySummary);
        setContent(sessionData.dailySummary.content || '');
      } else {
        // Initialize with empty content if no summary exists
        setContent('');
        setSummary(null);
      }
    } catch (error) {
      console.error('Error fetching session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) {
      alert('Please enter some content');
      return;
    }

    setSaving(true);
    try {
      await api.post(`/sessions/${id}/summary`, { content });
      alert('Summary saved successfully!');
      navigate(`/trainees/${session.traineeId}`);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save summary');
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="text-primary-text">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!session) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="text-primary-text">Session not found</div>
        </div>
      </Layout>
    );
  }

  const hasSummary = summary && summary.content && summary.content.trim() !== '';

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            to={`/trainees/${session.traineeId}`}
            className="text-accent-primary hover:underline mb-4 inline-block transition-colors duration-200"
          >
            ← Back to Profile
          </Link>
          <h1 className="text-3xl font-bold text-primary-text">
            {hasSummary ? 'Edit Daily Summary' : 'Write Daily Summary'}
          </h1>
          <div className="mt-2 text-primary-text-secondary">
            Session Date: {formatDate(session.sessionDate)} | Trainer:{' '}
            {formatUserName(session.trainer.username)} | Intake: {session.intake.name}
          </div>
        </div>

        <div className="bg-primary-secondary rounded-lg border border-primary-border p-6">
          {!hasSummary && (
            <div className="mb-4 p-4 bg-primary-tertiary rounded-lg border border-primary-border animate-fade-in">
              <p className="text-primary-text text-sm">
                This session doesn't have a summary yet. Use the editor below to write the daily summary.
              </p>
            </div>
          )}
          {hasSummary && (
            <div className="mb-4 p-4 bg-primary-tertiary rounded-lg border border-primary-border animate-fade-in">
              <p className="text-primary-text text-sm">
                Editing existing summary. You can view the summary before editing.
              </p>
            </div>
          )}
          <Editor
            onInit={(_evt, editor) => {
              editorRef.current = editor;
            }}
            value={content}
            onEditorChange={(newContent) => {
              setContent(newContent);
            }}
            init={{
              height: 500,
              menubar: false,
              plugins: [
                'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                'insertdatetime', 'media', 'table', 'help', 'wordcount'
              ],
              toolbar: 'undo redo | blocks | ' +
                'bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter ' +
                'alignright alignjustify | bullist numlist outdent indent | ' +
                'link image | removeformat | code | fullscreen | help',
              branding: false,
              promotion: false,
              placeholder: 'Write your daily summary here...',
            }}
          />
          <div className="mt-6 flex justify-between items-center">
            {hasSummary && (
              <Link
                to={`/sessions/${id}/summary/view`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-tertiary text-primary-text border border-primary-border rounded-md text-sm font-medium hover:bg-primary-secondary transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View Summary
              </Link>
            )}
            <div className="flex gap-3 ml-auto">
              <button
                onClick={() => navigate(`/trainees/${session.traineeId}`)}
                className="px-4 py-2 border border-primary-border rounded-md text-primary-text hover:bg-primary-tertiary transition-all duration-200 hover:scale-105 active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-accent-primary rounded-md text-white hover:opacity-90 disabled:opacity-50 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl disabled:scale-100"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {saving ? 'Saving...' : 'Save Summary'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DailySummary;

