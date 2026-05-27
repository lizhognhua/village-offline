import re

filepath = r"C:\Users\27139\Desktop\多用户驻村帮扶管理系统开发\source\src\app\visits\edit\[id]\page.tsx"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add photo state variables
old = "const [customStaffInput, setCustomStaffInput] = useState('');"
new = """const [customStaffInput, setCustomStaffInput] = useState('');
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [newPhotoFiles, setNewPhotoFiles] = useState<File[]>([]);
  const [newPhotoPreviews, setNewPhotoPreviews] = useState<string[]>([]);"""
content = content.replace(old, new)

# 2. Fix recType detection for reception
content = content.replace(
    "if (data.type === 'condolence') setRecType('condolence');",
    "if (data.type === 'condolence') setRecType('condolence'); else if (data.type === 'reception') setRecType('reception');"
)

# 3. Load existing photos
content = content.replace(
    "            staff: staffArr,",
    """            staff: staffArr,
          );
          if (data.photos) {
            try {
              const photos = typeof data.photos === 'string' ? JSON.parse(data.photos) : data.photos;
              setExistingPhotos(Array.isArray(photos) ? photos : []);
            } catch { setExistingPhotos([]); }
          }
        }"""
)

# 4. Add photo handlers before handleSave
content = content.replace(
    "  const handleSave = async () => {",
    """  const handleAddPhotos = (e: any) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      setNewPhotoFiles(p => [...p, files[i]]);
      setNewPhotoPreviews(p => [...p, URL.createObjectURL(files[i])]);
    }
  };
  const removeNewPhoto = (i: number) => { setNewPhotoFiles(p => p.filter((_,j) => j!==i)); setNewPhotoPreviews(p => p.filter((_,j) => j!==i)); };
  const removeExistingPhoto = (i: number) => { setExistingPhotos(p => p.filter((_,j) => j!==i)); };

  const handleSave = async () => {"""
)

# 5. Add photos to save JSON body
content = content.replace(
    "            staff: form.staff.join(','),\n          }),\n          if (res.ok) {",
    "            staff: form.staff.join(','), photos: JSON.stringify(existingPhotos) }), if (res.ok) {"
)

# 6. Add reception button
content = content.replace(
    "<Heart className=\"w-4 h-4\" /> 慰问\n            </button>\n          </div>",
    """<Heart className="w-4 h-4" /> 慰问
            </button>
            <button type="button" onClick={() => setRecType('reception')}
              className={'flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border transition-colors ' + (recType === 'reception' ? 'bg-blue-50 text-blue-700 border-blue-300 font-medium' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')}>
              <Users className="w-4 h-4" /> 来访
            </button>
          </div>"""
)

# 7. Add typeLabel and photo UI
content = content.replace("  if (loading) {", "  const typeLabel = recType === 'visit' ? '走访' : recType === 'condolence' ? '慰问' : '来访';\n\n  if (loading) {")

# 8. Replace type labels (visit/condolence text in JSX)
content = content.replace("{recType === 'visit' ? '走访' : '慰问'}日期", "{typeLabel}日期")
content = content.replace("{recType === 'visit' ? '走访' : '慰问'}内容", "{typeLabel}内容")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched successfully")
