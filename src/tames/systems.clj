(ns tames.systems
  (:gen-class)
  (:use ring.adapter.jetty)
  (:require [clojure.pprint :as pprint]
            [clojure.java.io :as io]
            [ring.util.response :as response]
            [clojure.data.json :as json]
            [clojure.string :as string]
            [tames.log :as log]
            [tames.config :as config]
            [tames.filesystem :as fs])
  (:import (java.io File InputStream)
           (java.nio.file Paths Path Files StandardCopyOption)
           (java.util.jar JarFile JarEntry)
           (java.util UUID Calendar)))

(def REGEXP_UUID #"[\w]{8}-[\w]{4}-[\w]{4}-[\w]{4}-[\w]{12}")
(def REGEXP_OBJECT_FILE_NAME #"^[\w]{8}-[\w]{4}-[\w]{4}-[\w]{4}-[\w]{12}\.json$")
(def OBJECT_ID_NAME "id")
(def CLASS_ID "a7b6a9e1-c95c-4e75-8f3d-f5558a264b35")
(def ACCOUNT_ID "9643597d-5513-4377-961c-643293fa3319")
(def GROUP_ID "Group")
(def FIELD_KEY "key")
(def FILES_ID "748189ad-ce16-43f6-ae2a-fa48e5ec4a39")
(def IMAGES_ID "4ee20d87-b73d-40a7-a521-170593ac2512")

;;; ------------------------------------------------------------
;;; Target paths
;;; ------------------------------------------------------------
(defn get-target-paths
  [path-type & descendants]
  (let [files   (map #(let [args (cons %1 descendants)]
                       (File. (apply fs/make-path args)))
                     (config/package-paths))
        targets (filter #(and (. %1 exists)
                              (cond (= path-type :file) (. %1 isFile)
                                    (= path-type :dir)  (. %1 isDirectory)
                                    :else               false))
                        files)]
    (if (empty? targets) files targets)))

(defn get-target-files
  [& descendants]
  (apply get-target-paths (cons :file descendants)))

(defn get-target-file
  [& descendants]
  (first (apply get-target-files descendants)))

(defn get-target-dirs
  [& descendants]
  (apply get-target-paths (cons :dir descendants)))

(defn get-target-dir
  [& descendants]
  (first (apply get-target-dirs descendants)))


;;; ------------------------------------------------------------
;;; Jar & Resources
;;; ------------------------------------------------------------
(defn get-resource-path
  [relative-path]
  (. (File. relative-path) getPath))

(defn get-jar-path
  [resource]
  (assert (not (nil? resource)))
  (assert (= "jar" (. resource getProtocol)))
  (let [path     (. resource getPath)
        start    (. "file:" length)
        end      (. path indexOf "!")
        jar-path (. path substring start end)]
    jar-path))

(defn extract-resource-path
  [resource-url]
  (assert (not (nil? resource-url)))
  (assert (= "jar" (. resource-url getProtocol)))
  (let [path          (. resource-url getPath)
        start         (+ (. path indexOf "!") 2)
        resource-path (. path substring start)]
    resource-path))

(defn get-jar-resource-entry
  [jar-url]
  (let [jar-path   (get-jar-path jar-url)
        jar-file   (JarFile. (File. jar-path))
        path       (extract-resource-path jar-url)
        jar-entry  (. jar-file getJarEntry path)]
    jar-entry))

(defn get-jar-resource-children
  [jar-path relative-path dir? file?]
  (let [jar-file   (JarFile. (File. jar-path))
        entries    (. jar-file entries)
        base-path  (. (File. relative-path) toPath)
        base-count (. base-path getNameCount)]
    (loop [paths '()]
      (if (. entries hasMoreElements)
          (let [entry          (. entries nextElement)
                path           (. entry getName)
                entry-path     (. (File. path) toPath)
                entry-path-cnt (. entry-path getNameCount)
                entry-dir?     (. entry isDirectory)]
            (recur (if (and (. entry-path startsWith base-path)
                            (= (+ base-count 1) entry-path-cnt)
                            (or (and dir? entry-dir?) (and file? (not entry-dir?))))
                       (cons (. (File. path) getName) paths)
                       paths)))
          (do
            (. jar-file close)
            (vec paths))))))

(defn get-absolute-children
  [relative-dir-path dir? file?]
  (let [absolute-dir (File. (fs/get-absolute-path relative-dir-path))
        children     (filter #(cond (and dir? file?) true
                                    (and dir? (not file?)) (. %1 isDirectory)
                                    (and (not dir?) file?) (not (. %1 isDirectory))
                                    :else                  false)
                             (. absolute-dir listFiles))]
    (map #(. %1 getName) children)))


(defn get-resource-type
  [resource-url]
  (let [protocol (if (nil? resource-url) nil (. resource-url getProtocol))]
    (cond (= "file" protocol) :file
          (= "jar" protocol)  :jar
          :else               :none)))

(defn get-resource-children
  [relative-dir-path dir? file?]
  (let [resource-url (io/resource relative-dir-path)
        type         (get-resource-type resource-url)]
    (cond (= :file type) (let [file     (io/as-file resource-url)
                               children (filter #(cond (and dir? file?) true
                                                       (and dir? (not file?)) (. %1 isDirectory)
                                                       (and (not dir?) file?) (not (. %1 isDirectory))
                                                       :else                  false)
                                                (. file listFiles))]
                           (map #(. %1 getName) children))
          (= :jar type)  (let [jar-path (get-jar-path resource-url)]
                           (get-jar-resource-children jar-path relative-dir-path dir? file?))
          :else          nil)))

(defn copy-resource-file
  [resource-path dst-path]
  (let [src-url       (io/resource resource-path)
        type          (get-resource-type src-url)
        last-modified (cond (= :file type) (let [file (File. (. src-url toURI))]
                                             (. file lastModified))
                            (= :jar  type) (let [entry    (get-jar-resource-entry src-url)
                                                 filetime (. entry getLastModifiedTime)]
                                             (. filetime toMillis)))
        dst-file      (File. dst-path)
        ]
    (with-open [stream (io/input-stream src-url)]
      (io/copy stream dst-file))
    (. dst-file setLastModified last-modified)
    ))


;;; ------------------------------------------------------------
;;; JSON files
;;; ------------------------------------------------------------
(defn get-json-file
  [class-id object-id]
  (get-target-file "data" class-id (format "%s.json" object-id)))

(defn get-json-dir
  [class-id]
  (get-target-dir "data" class-id))

(defn assoc-files
  [dic files]
  (if (empty? files)
      dic
      (let [file (first files)]
        (recur (assoc dic (. file getName) file) (rest files)))))
  
(defn get-json-files
  [class-id]
  (loop [files      {}
         class-dirs (get-target-dirs "data" class-id)]
    (if (empty? class-dirs)
        (vals files)
        (let [class-dir (first class-dirs)
              rest-dirs (rest class-dirs)
              tmp-files (filter #(and (. %1 isFile)
                                      (nil? (files (. %1 getName))))
                                (. class-dir listFiles))]
          (recur (assoc-files files tmp-files) rest-dirs)))))


;;; ------------------------------------------------------------
;;; File & Directory
;;; ------------------------------------------------------------
(defn ensure-directory
  [target]
  (let [dir (fs/to-file target)]
    (if (and (. dir exists) (not (. dir isDirectory)))
        (. dir delete))
    (if (not (. dir exists))
        (. dir mkdirs))))

(defn exists?
  [class-id object-id]
  (if (config/id? class-id)
      true
      (let [dir  (get-target-dir "data" class-id)
            file (get-json-file class-id object-id)]
        (cond (not (. dir isDirectory)) false
              (nil? object-id)          true
              :else                     (. file isFile)))))

(defn get-file-contents
  [path]
  { "file_path" path "file_contents" (slurp path) })


;;; ------------------------------------------------------------
;;; Object
;;; ------------------------------------------------------------
(defn get-object
  [class-id object-id]
  (let [file (if (config/id? class-id)
                 (File. @config/path)
                 (get-json-file class-id object-id))]
    (if (not (. file exists))
        nil
        (with-open [rdr (io/reader (. file getAbsolutePath))]
          (json/read rdr)))))

(defn get-objects
  [class-id]
  (let [files   (get-json-files class-id)
        objects (map #(with-open [rdr (io/reader (. %1 getAbsolutePath))]
                        (json/read rdr))
                     files)
        ids     (map #(%1 "id") objects)]
    (zipmap ids objects)))

(defn create-object
  [class-id object-id s-exp-data]
  (let [file (get-json-file class-id object-id)
        dir  (. file getParentFile)]
    (ensure-directory (. dir toString))
    (with-open [w (io/writer (. file toString))]
      (json/write s-exp-data w))))

(defn update-object
  [class-id object-id s-exp-data]
  (let [file (if (config/id? class-id)
                 (File. @config/path)
                 (get-json-file class-id object-id))]
    ;; !! CAUTION !!
    ;; Implement 's-exp-data' check logic!!
    (with-open [w (io/writer file)]
      (json/write s-exp-data w))))

(defn delete-object
  [class-id object-id]
  (let [file (get-json-file class-id object-id)]
    (fs/delete file)
    (if (= CLASS_ID class-id)
        (let [data-dir (get-json-dir object-id)]
          (fs/delete data-dir)))))

(defn get-object-as-json
  [class-id object-id]
  (json/write-str (get-object class-id object-id)))

(defn get-objects-as-json
  [class-id]
  (let [objects (get-objects class-id)]
    (json/write-str objects)))


;;; ------------------------------------------------------------
;;; Attachment
;;; ------------------------------------------------------------
(defn get-attachment-base-dirs
  [class-id object-id]
  (get-target-dirs "data" class-id (format ".%s" object-id)))

(defn get-attachment-base-dir
  [class-id object-id]
  (first (get-target-dirs "data" class-id (format ".%s" object-id))))

(defn get-attachment-dirs
  [class-id object-id field_name]
  (get-target-dirs "data" class-id (format ".%s" object-id) field_name))

(defn get-attachment-dir
  [class-id object-id field_name]
  (first (get-attachment-dirs class-id object-id field_name)))

(defn get-attachment-file
  [class-id object-id field_and_file_name]
  (get-target-file "data" class-id (format ".%s" object-id) field_and_file_name))
  
(defn get-files-fields
  [class-id]
  (let [class_ (get-object CLASS_ID class-id)]
    (filter #(let [id ((%1 "datatype") "id")]
               (or (= id FILES_ID)
                   (= id IMAGES_ID)))
            (class_ "object_fields"))))

(defn remove-attached-files
  [class-id object-id value files_fields]
  (doseq [field files_fields]
    (let [dst-dir    (get-attachment-dir class-id object-id (field "name"))
          file-names (keys ((value (field "name")) "remove"))]
      (doseq [file-name file-names]
        (let [file (File. dst-dir file-name)]
          (if (. file exists)
              (. file delete)))))))

(defn save-attached-files
  [class-id object-id value files_fields added-files]
  (doseq [field files_fields]
    (let [dst-dir   (get-attachment-dir class-id object-id (field "name"))
          file-keys (keys ((value (field "name")) "added"))]
      (ensure-directory dst-dir)
      (doseq [file-key file-keys]
        (let [file      (added-files (keyword file-key))
              tmp-file  (file :tempfile)
              file-name (. (File. (file :filename)) getName)
              dst-file  (.. (fs/to-path dst-dir) (resolve file-name) (toFile))]
          (io/copy tmp-file dst-file))))))

(defn update-files-values
  [class-id object-id files_fields raw-value]
  (let [base-dir-path (get-attachment-base-dir class-id object-id)
        field_names   (map #(%1 "name") files_fields)]
    (loop [names field_names
           value raw-value]
      (if (empty? names)
          value
          (let [name     (first names)
                dir      (fs/to-file (fs/make-path base-dir-path name))
                current  (map (fn [file] { "name" (. file getName) "size" (. file length) })
                              (vec (if (and (not (nil? dir)) (. dir exists) (. dir isDirectory))
                                       (. dir listFiles)
                                       [])))
                value1  (dissoc value name)
                value2  (assoc value name {"class_id" class-id "object_id" object-id "current" current})]
            (recur (rest names) value2))))))


;;; ------------------------------------------------------------
;;; Access
;;; ------------------------------------------------------------
(defn get-account
  [login_id]
  (let [accounts (filter #(= (%1 "login_id") login_id) (vals (get-objects ACCOUNT_ID)))
        account  (if (= (count accounts) 0) nil (first accounts))]
    account))

(defn is-user-in-group
  [account-id group-id]
  (let [group    (get-object GROUP_ID group-id)
        accounts (group "acounts")]
    (loop [rest-accounts accounts]
      (cond (empty? rest-accounts) false
            (= account-id (first rest-accounts)) true
            :else (recur (rest rest-accounts))))))

(defn get-last-modified
  [class-id object-id]
  (cond (config/id? class-id)
          (config/last-modified)
        (nil? object-id)
          (let [dirs      (get-target-dirs "data" class-id)
                files     (get-json-files class-id)
                all-items (sort #(- (. %2 lastModified) (. %1 lastModified))
                                (concat dirs files))]
            (. (first all-items) lastModified))
        :else
          (. (get-json-file class-id object-id) lastModified)))


;;; ------------------------------------------------------------
;;; Called from handler
;;; ------------------------------------------------------------
(defn get-data
  [class-id object-id]
  (-> (response/response (if (nil? object-id)
                             (get-objects-as-json class-id)
                             (get-object-as-json class-id object-id)))
      (response/header "Contents-Type" "text/json; charset=utf-8")))

(defn post-data
  [class-id data added-files]
  (let [object-id    (str (UUID/randomUUID))
        files_fields (get-files-fields class-id)
        data-with-id (assoc data OBJECT_ID_NAME object-id)]
    (save-attached-files class-id object-id data-with-id files_fields added-files)
    (let [pure-data (update-files-values class-id object-id files_fields data-with-id)]
      (create-object class-id object-id pure-data)
      (println "Posted OK.")
      (-> (response/response (get-object-as-json class-id object-id))
          (response/header "Contents-Type" "text/json; charset=utf-8")))))

(defn put-data
  [class-id object-id data added-files]
  (let [files_fields (get-files-fields class-id)]
    (remove-attached-files class-id object-id data files_fields)
    (save-attached-files class-id object-id data files_fields added-files)
    (let [pure-data (update-files-values class-id object-id files_fields data)]
      (update-object class-id object-id pure-data)
      (-> (response/response (get-objects-as-json class-id))
          (response/header "Contents-Type" "text/json; charset=utf-8")))))

(defn delete-data
  [class-id object-id]
  (delete-object class-id object-id)
  (fs/delete (get-attachment-base-dir class-id object-id))
  (-> (response/response (get-objects-as-json class-id))
      (response/header "Contents-Type" "text/json; charset=utf-8")))

(defn ensure-init-files
  [relative-path]
  (let [dirs  (get-resource-children relative-path true false)
        files (get-resource-children relative-path false true)]
    (if (or (nil? dirs) (nil? files))
        nil
        (do
          (ensure-directory relative-path)
          (doseq [dir dirs]
            (ensure-init-files (str relative-path "/" dir)))
          (doseq [file files]
            (let [src-path (str relative-path "/" file)
                  dst-path (str relative-path "/" file)]
              ;(println (format "[systems/ensure-init-files] %s" src-path))
              (if (not (. (File. (fs/get-absolute-path dst-path)) exists))
                  (copy-resource-file src-path dst-path))
                  ))))))

(defn init
  []
  (ensure-init-files "lib")
  (ensure-init-files "core")
  (ensure-init-files "data")
  true)



