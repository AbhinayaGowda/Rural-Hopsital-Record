import { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attachmentsApi } from '../api/attachments.js';
import Spinner from './Spinner.jsx';
import styles from './attachment-gallery.module.css';

const MAX_MB = 5;

function FileIcon() {
  return <span className={styles.fileIcon}>📄</span>;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AttachmentGallery({ memberId }) {
  const qc = useQueryClient();
  const fileInputRef = useRef(null);
  const [uploadErr, setUploadErr] = useState('');

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['attachments', 'member', memberId],
    queryFn: () => attachmentsApi.list(memberId),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['attachments', 'member', memberId] });

  const uploadMut = useMutation({
    mutationFn: (file) => attachmentsApi.upload(memberId, file),
    onSuccess: () => { setUploadErr(''); invalidate(); },
    onError: (e) => setUploadErr(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (attachmentId) => attachmentsApi.delete(memberId, attachmentId),
    onSuccess: invalidate,
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      setUploadErr(`File too large — max ${MAX_MB} MB`);
      e.target.value = '';
      return;
    }
    setUploadErr('');
    uploadMut.mutate(file);
    e.target.value = '';
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.label}>Attachments ({attachments.length})</span>
        <button
          className={styles.uploadBtn}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMut.isPending}
        >
          {uploadMut.isPending ? 'Uploading…' : '+ Add file'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
          className={styles.hiddenInput}
          onChange={handleFileChange}
        />
      </div>

      {uploadErr && <p className={styles.error}>{uploadErr}</p>}

      {isLoading ? <Spinner /> : (
        <div className={styles.grid}>
          {attachments.length === 0 && (
            <p className={styles.empty}>No attachments yet. Add photos or PDF reports.</p>
          )}
          {attachments.map((a) => (
            <div key={a.id} className={styles.card}>
              {a.mime_type.startsWith('image/') ? (
                <a href={a.url} target="_blank" rel="noreferrer" className={styles.imgLink}>
                  <img src={a.url} alt="attachment" className={styles.thumb} />
                </a>
              ) : (
                <a href={a.url} target="_blank" rel="noreferrer" className={styles.docLink}>
                  <FileIcon />
                  <span className={styles.docName}>
                    {a.storage_path.split('/').pop()}
                  </span>
                </a>
              )}
              <div className={styles.meta}>
                <span className={styles.size}>{formatBytes(a.size_bytes)}</span>
                <span className={styles.uploader}>{a.profiles?.full_name ?? '—'}</span>
              </div>
              <button
                className={styles.deleteBtn}
                onClick={() => deleteMut.mutate(a.id)}
                disabled={deleteMut.isPending}
                title="Remove"
              >×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

AttachmentGallery.propTypes = { memberId: PropTypes.string.isRequired };
