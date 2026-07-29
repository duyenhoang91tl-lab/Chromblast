const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { filterText, containsProfanity } = require('./profanity-filter.js');

admin.initializeApp();

/**
 * Kiểm duyệt 1 tin nhắn chat: nếu chứa từ thô tục, ghi đè lại nội dung đã
 * được che (giữ nguyên độ dài) và đánh dấu moderated=true.
 * Chạy bằng quyền admin nên vẫn xử lý được kể cả khi client bỏ qua bộ lọc
 * ở app (ví dụ do sửa code, gọi thẳng Firestore SDK).
 */
async function moderateMessage(snap) {
  const data = snap.data();
  const text = data && typeof data.text === 'string' ? data.text : '';
  if (!text || !containsProfanity(text)) return null;

  const cleaned = filterText(text);
  if (cleaned === text) return null;

  return snap.ref.update({
    text: cleaned,
    moderated: true,
    moderatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

// Mặc định deploy ở us-central1. Nếu muốn giảm độ trễ cho người chơi ở VN,
// có thể thêm .region('asia-southeast1') vào từng function bên dưới —
// miễn là trùng với vùng của Cloud Firestore trong dự án Firebase.
exports.moderateWorldChat = functions
  .firestore.document('worldChat/global/messages/{msgId}')
  .onCreate((snap) => moderateMessage(snap));

exports.moderateRoomChat = functions
  .firestore.document('rooms/{roomId}/chat/{msgId}')
  .onCreate((snap) => moderateMessage(snap));

exports.moderateDmChat = functions
  .firestore.document('dms/{dmId}/messages/{msgId}')
  .onCreate((snap) => moderateMessage(snap));
