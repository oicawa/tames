(ns tames.operations.fonts
  (:require [clojure.data.json :as json]
            [clojure.pprint :as pprint]
            [ring.util.response :as response])
  (:import (java.awt GraphicsEnvironment)
           (sun.font FontManagerFactory)
           (java.util Locale)))

(defn get-family-names
  [data]
  (let [ge    (GraphicsEnvironment/getLocalGraphicsEnvironment)
        names (. ge getAvailableFontFamilyNames)]
    (-> (response/response (json/write-str (vec names)))
        (response/header "Contents-Type" "text/json; charset=utf-8"))))

(defn get-list
  [data]
  (let [font-manager  (FontManagerFactory/getInstance)
        font-path     (. font-manager getPlatformFontPath true)
        ge            (GraphicsEnvironment/getLocalGraphicsEnvironment)
        family-names  (. ge getAvailableFontFamilyNames)
        fonts         (. ge getAllFonts)
        all-font-list (map #(let [name   (. %1 getName)
                                  family (. %1 getFamily (Locale/JAPANESE))
                                  face   (. %1 getFontName (Locale/JAPANESE))
                                  plain  (. %1 isPlain)
                                  bold   (. %1 isBold)
                                  italic (. %1 isItalic)
                                  style  (. %1 getStyle)
                                  file   (. font-manager getFileNameForFontName name)]
                              { "name" name "family" family "face" face "plain" plain "bold" bold "italic" italic "style" style "file" file })
                           fonts)
        font-list     (filter #(not (nil? (%1 "file")))
                              all-font-list)
        ]
    ;(println (format "font-path=[%s]" font-path))
    ;(pprint/pprint font-list)
    (-> (response/response (json/write-str font-list))
        (response/header "Contents-Type" "text/json; charset=utf-8"))))


(defn get-file-path
  [font-name]
  (let [font-manager   (FontManagerFactory/getInstance)
        font-directory (. font-manager getPlatformFontPath true)
        font-file      (. font-manager getFileNameForFontName font-name)
        font-path      (format "%s/%s" font-directory font-file)]
    font-path))
  



