/* Copyright (c) 2012-2013 The TagSpaces Authors. All rights reserved.
 * Use of this source code is governed by a AGPL3 license that 
 * can be found in the LICENSE file. */
define(function (require, exports, module) {
    "use strict";

    console.log("Loading ioapi.cordova.js..");

    var TSCORE = require("tscore");
    
    var TSPOSTIO = require("tspostioapi");   

    var fsRoot = undefined;

    document.addEventListener("deviceready", onDeviceReady, false);

    // Cordova loaded and can be used
    function onDeviceReady() {
        console.log("Devive Ready: "+device.platform+" - "+device.version);
        getFileSystem();
    }

    function getFileSystem() {
        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0,
            function (fileSystem) { // success get file system
                fsRoot = fileSystem.root;
                console.log("Filesystem Name: " + fsRoot.fullPath);
            }, 
            function (evt) { // error get file system
                console.log("File System Error: " + evt.target.error.code);
            }
        );
    }

    // TODO recursivly calling callback not working        
    var anotatedDirListing = undefined;
    var pendingRecursions = 0;
    function scanDirectory(entries) {
	    var i;
	    pendingRecursions++;
	    var recursionStarted = false;
	    for (i = 0; i < entries.length; i++) {
	       if (entries[i].isFile) {
               console.log("File: "+entries[i].name);
               anotatedDirListing.push({
                   "name":   entries[i].name,
                   "isFile": entries[i].isFile,
                   "size":   "", // TODO
                   "lmdt":   "", // 
                   "path":   entries[i].fullPath
               });                
	       } else {
	           var directoryReader = entries[i].createReader();
	           directoryReader.readEntries(
	           	   scanDirectory,
		           function (error) {
		                console.log("Error reading dir entries: " + error.code);
		           } );
	           recursionStarted = true;
	       }
	    }
	    if(!recursionStarted) {
	    	pendingRecursions--;	    	
	    }
        if(pendingRecursions == 0) {
       		TSPOSTIO.createDirectoryIndex(anotatedDirListing);
        }
    }
    
    // TODO recursivly calling callback not working
    function generateDirectoryTree(dirPath) {        

    }  
    
    var createDirectoryIndex = function(dirPath) {
        //TSCORE.showAlertDialog("Creating directory index is not supported on Android yet.");  
        dirPath = dirPath+"/"; // TODO make it platform independent
        dirPath = normalizePath(dirPath);
        console.log("Creating index for directory: "+dirPath);
        anotatedDirListing = [];
        pendingRecursions = 0;
        fsRoot.getDirectory(dirPath, {create: false, exclusive: false}, 
            function (dirEntry) {
                var directoryReader = dirEntry.createReader();
        
                // Get a list of all the entries in the directory
                directoryReader.readEntries(
 					scanDirectory, 
 					function (error) { // error get file system
                        console.log("Dir List Error: " + error.code);
                    }            
               );
           },
           function (error) {
                console.log("Getting dir: "+dirPath+" failed with error code: " + error.code);
           }                
        );       
    };
    
    var createDirectoryTree = function(dirPath) {
        console.log("Creating directory index for: "+dirPath);
        TSCORE.showAlertDialog("Creating directory tree is not supported on Android yet.");                 
/*        var directoyTree = generateDirectoryTree(dirPath);
        //console.log(JSON.stringify(directoyTree));
        TSPOSTIO.createDirectoryTree(directoyTree);*/
    };     
    
    function isWindows() {
        return (navigator.platform == 'Win32');
    }
    
    function getDirseparator() {
        if(isWindows()) {
            return "\\";
        } else {
            return "/";
        }
    }
    
    function normalizePath(path) {
        if(path.indexOf(fsRoot.fullPath) >= 0) {
            path = path.substring(fsRoot.fullPath.length+1, path.length);                    
        }
        return path;
    }
    
    var checkNewVersion = function() {
        console.log("Checking for new version...");
        var cVer = TSCORE.Config.DefaultSettings["appVersion"]+"."+TSCORE.Config.DefaultSettings["appBuild"];
        $.ajax({
            url: 'http://tagspaces.org/releases/version.json?pVer='+cVer,
            type: 'GET',
        })
        .done(function(data) { 
            TSPOSTIO.checkNewVersion(data);    
        })
        .fail(function(data) { 
            console.log("AJAX failed "+data); 
        })
        ;            
    };   
    
    var listDirectory = function (dirPath) {
        TSCORE.showLoadingAnimation();          
        // directory path format DCIM/Camera/ !
        dirPath = dirPath+"/"; // TODO make it platform independent
        dirPath = normalizePath(dirPath);
        
        console.log("Listing directory: " + dirPath);

        fsRoot.getDirectory(dirPath, {create: false, exclusive: false}, 
            function (dirEntry) {
                var directoryReader = dirEntry.createReader();
		        var anotatedDirList = [];
				var pendingCallbacks = 0;        
                // Get a list of all the entries in the directory
                directoryReader.readEntries(
                    function (entries) { 
                        var i;
                        for (i = 0; i < entries.length; i++) {
                            if(entries[i].isFile) {
								pendingCallbacks++;	
	                            entries[i].file(
	                            	function(entry) {
			                            anotatedDirList.push({
			                                "name":   entry.name,
			                                "isFile": true,
			                                "size":   entry.size,
			                                "lmdt":   entry.lastModifiedDate,
			                                "path":   entry.fullPath
			                            });
			                            pendingCallbacks--;                            								                            		
                            			console.log("File: "+entry.name+" Size: "+entry.size+ " i:"+i+" Callb: "+pendingCallbacks);
			                            if(pendingCallbacks == 0 && i == entries.length) {
			                            	TSPOSTIO.listDirectory(anotatedDirList);
			                            }                          
				                    }, function (error) { // error get file system
				                        console.log("Getting file meta error: " + error.code);
				                    }                                        	
	                            );                            	
                            } else {
	                            anotatedDirList.push({
	                                "name":   entries[i].name,
	                                "isFile": false,
	                                "size":   "",
	                                "lmdt":   "",
	                                "path":   entries[i].fullPath
	                            });
                            	console.log("Dir: "+entries[i].name+ " I:"+i+" Callb: "+pendingCallbacks);                            	
	                            if((pendingCallbacks == 0) && ((i+1) == entries.length)) {
	                            	TSPOSTIO.listDirectory(anotatedDirList);
	                            }                            				                            	
                            } 
                                                   
                        }
                        if(pendingCallbacks == 0) {
                        	TSPOSTIO.listDirectory(anotatedDirList);
                        }   
                        //console.log("Dir content: " + JSON.stringify(entries));
  
                    }, function (error) { // error get file system
                        TSPOSTIO.errorOpeningPath();
                        console.log("Dir List Error: " + error.code);
                    }            
               );
           },
           function (error) {
                TSPOSTIO.errorOpeningPath();
                console.log("Getting dir: "+dirPath+" failed with error code: " + error.code);
           }                
        ); 
    };

    var deleteElement = function(path) {
        console.log("Deleting: "+path);
        TSCORE.showLoadingAnimation();  
        
        path = normalizePath(path);
 
        fsRoot.getFile(path, {create: false, exclusive: false}, 
            function(entry) {
                entry.remove(
                    function() {
                        console.log("file deleted: "+path);
                        TSPOSTIO.deleteElement(path);                           
                    },
                    function() {
                        console.log("error deleting: "+path);
                    }                                  
                );
            },
            function() {
                console.log("error getting file");
            }        
        );
    };

    var loadTextFile = function(filePath) {
        console.log("Loading file: "+filePath);
        TSCORE.showLoadingAnimation();  

        filePath = normalizePath(filePath);
        fsRoot.getFile(filePath, {create: false, exclusive: false}, 
            function(entry) {
                entry.file(
                    function(file) {
                        var reader = new FileReader();
                        reader.onloadend = function(evt) {
                            TSPOSTIO.loadTextFile(evt.target.result); 
                        };
                        reader.readAsText(file);                              
                    },
                    function() {
                        console.log("error getting file: "+filePath);
                    }                                  
                );
            },
            function() {
                console.log("Error getting file entry: "+filePath);
            }        
        ); 
    };
    
    var saveTextFile = function(filePath,content) {
        console.log("Saving file: "+filePath);
        TSCORE.showLoadingAnimation();  

        filePath = normalizePath(filePath);
        fsRoot.getFile(filePath, {create: true, exclusive: false}, 
            function(entry) {
                entry.createWriter(
                    function(writer) {
                        writer.onwriteend = function(evt) {
                            TSPOSTIO.saveTextFile(fsRoot.fullPath+"/"+filePath);
                        };
                        writer.write(content);                           
                    },
                    function() {
                        console.log("error creating writter file: "+filePath);
                    }                                  
                );
            },
            function() {
                console.log("Error getting file entry: "+filePath);
            }        
        ); 
    };   

    var createDirectory = function(dirPath) {
        console.log("Creating directory: "+dirPath);    
        TSCORE.showLoadingAnimation();  

        dirPath = normalizePath(dirPath);

        fsRoot.getDirectory(dirPath, {create: true, exclusive: false}, 
           function (dirEntry) {
                TSPOSTIO.createDirectory();
           },
           function (error) {
                console.log("Creating directory failed: "+dirPath+" failed with error code: " + error.code);
           }  
        );
    }; 
    
    var renameFile = function(filePath, newFilePath) {
        TSCORE.showLoadingAnimation();  
        
        filePath = normalizePath(filePath);
        var newFileName = newFilePath.substring(newFilePath.lastIndexOf('/')+1);
        var newFileParentPath = normalizePath(newFilePath.substring(0, newFilePath.lastIndexOf('/')));
        // TODO check if the newFilePath exist or cause issues by renaming
        fsRoot.getDirectory(newFileParentPath, {create: false, exclusive: false}, 
            function (parentDirEntry) {
                fsRoot.getFile(filePath, {create: false, exclusive: false}, 
                    function(entry) {
                        entry.moveTo(
                            parentDirEntry,
                            newFileName,
                            function() {
                                console.log("File renamed to: "+newFilePath+" Old name: "+entry.fullPath);
                                TSPOSTIO.renameFile(entry.fullPath, newFilePath);                                
                            },
                            function() {
                                console.log("error renaming: "+filePath);
                            }                                  
                        );
                    },
                    function() {
                        console.log("Error getting file: "+filePath);
                    }        
                );      
           },
           function (error) {
                console.log("Getting dir: "+newFileParentPath+" failed with error code: " + error.code);
           }                
        );
    };

    var selectDirectory = function() {
        console.log("Operation selectDirectory not supported on Android yet!");
        TSCORE.showAlertDialog("Selecting directory not supported on Android yet, please enter the desired directory path manually in the textbox!");         
    };

    var selectFile = function() {
        console.log("Operation selectFile not supported on Android!");
    };
    
    var checkAccessFileURLAllowed = function() {
        console.log("checkAccessFileURLAllowed function not relevant for Android..");        
    };
    
    var openDirectory = function(dirPath) {
        TSCORE.showAlertDialog("Select file functionality not supported on Android!");
    };
    
    var openExtensionsDirectory = function() {
        TSCORE.showAlertDialog("Open extensions directory functionality not supported on Android!"); 
    };
    
	exports.createDirectory 			= createDirectory; 
	exports.renameFile 					= renameFile;
	exports.loadTextFile 				= loadTextFile;
	exports.saveTextFile 				= saveTextFile;
	exports.listDirectory 				= listDirectory;
	exports.deleteElement 				= deleteElement;
    exports.createDirectoryIndex 		= createDirectoryIndex;
    exports.createDirectoryTree 		= createDirectoryTree;
	exports.selectDirectory 			= selectDirectory;
	exports.openDirectory				= openDirectory;
	exports.selectFile 					= selectFile;
	exports.openExtensionsDirectory 	= openExtensionsDirectory;
	exports.checkAccessFileURLAllowed 	= checkAccessFileURLAllowed;
	exports.checkNewVersion 			= checkNewVersion;	    
});